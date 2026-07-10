package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.BrowseApplicationsUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.DocumentRepositoryPort;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;
import com.afriland.diaspora.domain.model.ApplicationSummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class ApplicationBrowsingService implements BrowseApplicationsUseCase {

    /** Parité get_document_type_label (app/routers/backoffice.py). */
    private static final Map<String, String> DOCUMENT_LABELS = Map.ofEntries(
            Map.entry("IDENTITY_DOCUMENT", "Pièce d’identité officielle"),
            Map.entry("IDENTITY_DOCUMENT_PHOTO", "Pièce d’identité officielle"),
            Map.entry("IDENTITY_DOCUMENT_RECTO", "Pièce d’identité officielle - Recto"),
            Map.entry("IDENTITY_DOCUMENT_VERSO", "Pièce d’identité officielle - Verso"),
            Map.entry("IDENTITY_DOCUMENT_IMPORTED", "Pièce d’identité officielle importée"),
            Map.entry("CNI_RECTO", "Pièce d’identité - recto"),
            Map.entry("CNI_VERSO", "Pièce d’identité - verso"),
            Map.entry("PASSPORT_DOCUMENT", "Passeport"),
            Map.entry("RESIDENCE_PERMIT_RECTO", "Titre de séjour - recto"),
            Map.entry("RESIDENCE_PERMIT_VERSO", "Titre de séjour - verso"),
            Map.entry("CONSULAR_CARD_RECTO", "Carte consulaire - recto"),
            Map.entry("CONSULAR_CARD_VERSO", "Carte consulaire - verso"),
            Map.entry("ADDRESS_PROOF", "Justificatif de domicile"),
            Map.entry("CLIENT_PHOTO", "Photo client"),
            Map.entry("CLIENT_VIDEO", "Vidéo client"),
            Map.entry("PROOF_OF_ADDRESS_PHOTO", "Justificatif de domicile"),
            Map.entry("INCOME_PROOF", "Preuve de justification de revenu / activité"),
            Map.entry("RIB_DOCUMENT", "Relevé d’identification bancaire - RIB"),
            Map.entry("SELFIE_PHOTO", "Selfie / preuve de vie - Photo"),
            Map.entry("SELFIE_VIDEO", "Selfie / preuve de vie - Vidéo"),
            Map.entry("SELFIE_IMPORTED", "Selfie importé"),
            Map.entry("BIRTH_CERTIFICATE_PHOTO", "Acte de naissance ou pièce avec filiation"),
            Map.entry("EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO", "Fiche de paie / attestation d’emploi / scolarité"),
            Map.entry("TAX_COMPLIANCE_CERTIFICATE_PHOTO", "Attestation de conformité fiscale"));

    /** Parité BACKOFFICE_DOCUMENT_ORDER_CLEAN_V1. */
    private static final Map<String, Integer> DOCUMENT_ORDER = Map.ofEntries(
            Map.entry("CNI_RECTO", 10),
            Map.entry("IDENTITY_DOCUMENT_RECTO", 11),
            Map.entry("CNI_VERSO", 12),
            Map.entry("IDENTITY_DOCUMENT_VERSO", 13),
            Map.entry("IDENTITY_DOCUMENT", 14),
            Map.entry("IDENTITY_DOCUMENT_PHOTO", 15),
            Map.entry("IDENTITY_DOCUMENT_IMPORTED", 16),
            Map.entry("PASSPORT_DOCUMENT", 17),
            Map.entry("RESIDENCE_PERMIT_RECTO", 18),
            Map.entry("RESIDENCE_PERMIT_VERSO", 19),
            Map.entry("CONSULAR_CARD_RECTO", 20),
            Map.entry("CONSULAR_CARD_VERSO", 21),
            Map.entry("ADDRESS_PROOF", 30),
            Map.entry("PROOF_OF_ADDRESS_PHOTO", 31),
            Map.entry("INCOME_PROOF", 40),
            Map.entry("RIB_DOCUMENT", 50),
            Map.entry("CLIENT_PHOTO", 60),
            Map.entry("SELFIE_PHOTO", 61),
            Map.entry("SELFIE_IMPORTED", 62),
            Map.entry("CLIENT_VIDEO", 70),
            Map.entry("SELFIE_VIDEO", 71),
            Map.entry("BIRTH_CERTIFICATE_PHOTO", 80),
            Map.entry("EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO", 81),
            Map.entry("TAX_COMPLIANCE_CERTIFICATE_PHOTO", 82));

    private static final Set<String> MEDIA_ONLY_TYPES =
            Set.of("CLIENT_PHOTO", "CLIENT_VIDEO", "SELFIE_PHOTO", "SELFIE_VIDEO");

    private static final Set<String> VIDEO_TYPES = Set.of("CLIENT_VIDEO", "SELFIE_VIDEO");

    private final ApplicationRepositoryPort applications;
    private final DocumentRepositoryPort documents;

    public ApplicationBrowsingService(ApplicationRepositoryPort applications, DocumentRepositoryPort documents) {
        this.applications = applications;
        this.documents = documents;
    }

    @Override
    public List<ApplicationSummary> listApplications() {
        return applications.findAllSummaries();
    }

    @Override
    public ApplicationWithDocuments getApplication(String idOrReference) {
        ApplicationDetail application = findByIdOrReference(idOrReference)
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable"));

        List<ApplicationDocumentInfo> rows = documents.findByApplicationId(application.id());

        // BACKOFFICE_HIDE_JSON_DOCUMENTS_V1
        List<ApplicationDocumentInfo> visible = rows.stream()
                .filter(doc -> !documentFilename(doc).toLowerCase(Locale.ROOT).endsWith(".json"))
                .toList();

        // BACKOFFICE_LATEST_DOCUMENTS_BY_TYPE_V1 — dernier document (id max) de chaque type.
        Map<String, ApplicationDocumentInfo> latest = new LinkedHashMap<>();
        for (ApplicationDocumentInfo doc : visible) {
            String key = doc.documentType() == null || doc.documentType().isEmpty()
                    ? "DOC_" + doc.id()
                    : doc.documentType();
            ApplicationDocumentInfo current = latest.get(key);
            if (current == null || docId(doc) >= docId(current)) {
                latest.put(key, doc);
            }
        }

        List<DocumentView> views = latest.values().stream()
                .sorted(Comparator
                        .comparingInt((ApplicationDocumentInfo doc) ->
                                DOCUMENT_ORDER.getOrDefault(documentType(doc), 999))
                        .thenComparing(Comparator.comparingLong(ApplicationBrowsingService::docId).reversed()))
                .map(this::toView)
                .toList();

        return new ApplicationWithDocuments(application, views);
    }

    private Optional<ApplicationDetail> findByIdOrReference(String idOrReference) {
        String raw = idOrReference == null ? "" : idOrReference.strip();
        if (raw.isEmpty()) {
            return Optional.empty();
        }

        if (raw.chars().allMatch(Character::isDigit)) {
            try {
                Optional<ApplicationDetail> byId = applications.findById(Long.parseLong(raw));
                if (byId.isPresent()) {
                    return byId;
                }
            } catch (NumberFormatException ignored) {
                // valeur numérique trop longue : on retombe sur la recherche par référence
            }
        }

        return applications.findByReference(raw);
    }

    private DocumentView toView(ApplicationDocumentInfo doc) {
        String type = documentType(doc);
        return new DocumentView(
                docId(doc),
                doc.documentType(),
                DOCUMENT_LABELS.getOrDefault(type,
                        doc.documentType() == null || doc.documentType().isEmpty() ? "Document" : doc.documentType()),
                doc.originalFilename(),
                doc.mimeType(),
                doc.verificationStatus(),
                doc.qualityScore(),
                doc.sha256Hash(),
                isVideo(doc),
                MEDIA_ONLY_TYPES.contains(type));
    }

    private static boolean isVideo(ApplicationDocumentInfo doc) {
        String mime = doc.mimeType() == null ? "" : doc.mimeType().toLowerCase(Locale.ROOT);
        String name = documentFilename(doc).toLowerCase(Locale.ROOT);
        return mime.startsWith("video/")
                || name.endsWith(".webm") || name.endsWith(".mp4") || name.endsWith(".mov")
                || VIDEO_TYPES.contains(documentType(doc));
    }

    private static String documentFilename(ApplicationDocumentInfo doc) {
        if (doc.originalFilename() != null && !doc.originalFilename().isEmpty()) {
            return doc.originalFilename();
        }
        return doc.filePath() == null ? "" : doc.filePath();
    }

    private static String documentType(ApplicationDocumentInfo doc) {
        return doc.documentType() == null ? "" : doc.documentType().toUpperCase(Locale.ROOT);
    }

    private static long docId(ApplicationDocumentInfo doc) {
        return doc.id() == null ? 0L : doc.id();
    }
}
