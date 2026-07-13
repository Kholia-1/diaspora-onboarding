package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.UploadDocumentUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.DocumentCryptoPort;
import com.afriland.diaspora.application.port.out.DocumentRepositoryPort;
import com.afriland.diaspora.application.port.out.DocumentStoragePort;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;
import com.afriland.diaspora.domain.service.DocumentScoring;
import com.afriland.diaspora.domain.service.DocumentStatusRules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class UploadDocumentService implements UploadDocumentUseCase {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "application/pdf",
            "video/webm", "video/mp4", "video/quicktime");

    private static final Map<String, String> EXTENSION_BY_MIME = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "application/pdf", ".pdf",
            "video/webm", ".webm",
            "video/mp4", ".mp4",
            "video/quicktime", ".mov");

    /** Score/état documentaire neutres (voir divergence : pas d'analyse OCR côté Java en Phase 5A). */
    private static final double NEUTRAL_QUALITY = 60.0;
    private static final String NEUTRAL_VERIFICATION = "UPLOADED";

    private final ApplicationRepositoryPort applications;
    private final DocumentRepositoryPort documents;
    private final DocumentCryptoPort crypto;
    private final DocumentStoragePort storage;

    public UploadDocumentService(ApplicationRepositoryPort applications, DocumentRepositoryPort documents,
                                 DocumentCryptoPort crypto, DocumentStoragePort storage) {
        this.applications = applications;
        this.documents = documents;
        this.crypto = crypto;
        this.storage = storage;
    }

    @Override
    @Transactional
    public Map<String, Object> upload(long applicationId, String documentType, String filename,
                                      String contentType, byte[] content) {
        ApplicationDetail application = applications.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Demande introuvable"));

        if (content == null || content.length == 0) {
            throw ApiException.badRequest("Le fichier transmis est vide.");
        }
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw ApiException.badRequest(
                    "Type de fichier non accepté. Formats autorisés : JPG, PNG, WEBP, PDF, WEBM, MP4 ou MOV.");
        }

        String sha256 = sha256Hex(content);
        String extension = safeExtension(filename, contentType);
        String fileName = application.reference() + "_" + documentType + "_"
                + UUID.randomUUID().toString().replace("-", "") + extension + ".enc";

        String analysisJson = "{\"document_type\": \"" + documentType
                + "\", \"verification_status\": \"" + NEUTRAL_VERIFICATION
                + "\", \"quality_score\": " + (int) NEUTRAL_QUALITY
                + ", \"note\": \"Analyse OCR différée (Phase 5A)\"}";

        byte[] encryptedContent = crypto.encrypt(content);
        byte[] encryptedAnalysis = crypto.encrypt(analysisJson.getBytes(StandardCharsets.UTF_8));

        String filePath = storage.saveApplicationDocument(fileName, encryptedContent, encryptedAnalysis);

        String originalFilename = filename != null && !filename.isBlank()
                ? filename
                : fileName.replace(".enc", "");

        documents.save(new ApplicationDocumentInfo(
                null, applicationId, documentType, originalFilename, filePath, contentType, sha256,
                NEUTRAL_VERIFICATION, NEUTRAL_QUALITY, LocalDateTime.now(ZoneOffset.UTC)));

        Set<String> uploadedTypes = documents.findDocumentTypesByApplicationId(applicationId);
        uploadedTypes.add(documentType);

        boolean hasRib = application.rib() != null && !application.rib().isBlank();
        int documentScore = DocumentScoring.calculate(application.residencyStatus(), hasRib, uploadedTypes);

        double kyc = application.kycScore() == null ? 0.0 : application.kycScore();
        String newStatus = DocumentStatusRules.nextStatus(kyc, documentScore, application.status());
        applications.updateDocumentScoreAndStatus(applicationId, documentScore, newStatus);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Document chargé avec succès");
        response.put("application_reference", application.reference());
        response.put("document_type", documentType);
        response.put("filename", originalFilename);
        response.put("mime_type", contentType);
        response.put("sha256", sha256);
        response.put("document_score", documentScore);
        response.put("verification_status", NEUTRAL_VERIFICATION);
        response.put("quality_score", NEUTRAL_QUALITY);
        // Analyse OCR non exécutée côté Java en Phase 5A (voir divergence).
        response.put("ocr_status", "NOT_ANALYZED");
        response.put("match_status", "NOT_REQUIRED");
        response.put("match_score", 0);
        response.put("ocr_text_preview", "");
        return response;
    }

    private static String safeExtension(String filename, String contentType) {
        if (filename != null) {
            int dot = filename.lastIndexOf('.');
            if (dot >= 0 && dot < filename.length() - 1) {
                return filename.substring(dot).toLowerCase(Locale.ROOT);
            }
        }
        String mapped = EXTENSION_BY_MIME.get(contentType);
        return mapped != null ? mapped : ".bin";
    }

    private static String sha256Hex(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (Exception e) {
            throw ApiException.internal("Impossible de calculer l'empreinte du document.");
        }
    }
}
