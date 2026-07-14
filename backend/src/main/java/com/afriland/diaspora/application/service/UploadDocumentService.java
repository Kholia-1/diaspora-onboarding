package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.UploadDocumentUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.DocumentCryptoPort;
import com.afriland.diaspora.application.port.out.DocumentRepositoryPort;
import com.afriland.diaspora.application.port.out.DocumentStoragePort;
import com.afriland.diaspora.application.port.out.OcrPort;
import com.afriland.diaspora.application.port.out.OcrPort.OcrExtraction;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;
import com.afriland.diaspora.domain.service.DocumentScoring;
import com.afriland.diaspora.domain.service.DocumentStatusRules;
import com.afriland.diaspora.domain.service.DocumentVerificationRules;
import com.afriland.diaspora.domain.service.DocumentVerificationRules.MatchingRoute;
import com.afriland.diaspora.domain.service.OcrMatching;
import com.afriland.diaspora.domain.service.OcrMatching.ApplicantIdentity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class UploadDocumentService implements UploadDocumentUseCase {

    private static final Logger log = LoggerFactory.getLogger(UploadDocumentService.class);

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

    /** Aperçu texte OCR — parité (analysis.get("ocr").get("text") or "")[:300]. */
    private static final int TEXT_PREVIEW_LIMIT = 300;

    private final ApplicationRepositoryPort applications;
    private final DocumentRepositoryPort documents;
    private final DocumentCryptoPort crypto;
    private final DocumentStoragePort storage;
    private final OcrPort ocr;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UploadDocumentService(ApplicationRepositoryPort applications, DocumentRepositoryPort documents,
                                 DocumentCryptoPort crypto, DocumentStoragePort storage,
                                 OcrPort ocr) {
        this.applications = applications;
        this.documents = documents;
        this.crypto = crypto;
        this.storage = storage;
        this.ocr = ocr;
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

        String originalFilename = filename != null && !filename.isBlank()
                ? filename
                : fileName.replace(".enc", "");

        // OCR + rapprochement OCR ↔ dossier (parité analyze_document_content). Fail-safe :
        // toute indisponibilité OCR retombe sur une analyse neutre sans bloquer l'upload.
        AnalysisResult analysis = buildAnalysis(application, documentType, originalFilename, contentType, content);

        byte[] encryptedContent = crypto.encrypt(content);
        byte[] encryptedAnalysis = crypto.encrypt(toJsonBytes(analysis.analysis()));

        String filePath = storage.saveApplicationDocument(fileName, encryptedContent, encryptedAnalysis);

        documents.save(new ApplicationDocumentInfo(
                null, applicationId, documentType, originalFilename, filePath, contentType, sha256,
                analysis.verificationStatus(), analysis.qualityScore(), LocalDateTime.now(ZoneOffset.UTC)));

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
        response.put("verification_status", analysis.verificationStatus());
        response.put("quality_score", analysis.qualityScore());
        response.put("ocr_status", analysis.ocrStatus());
        response.put("match_status", analysis.matchStatus());
        response.put("match_score", analysis.matchScore());
        response.put("ocr_text_preview", analysis.textPreview());
        return response;
    }

    // ------------------------------------------------------------------
    // Analyse documentaire (OCR + matching) — parité analyze_document_content
    // ------------------------------------------------------------------

    private record AnalysisResult(
            Map<String, Object> analysis,
            String verificationStatus,
            double qualityScore,
            String ocrStatus,
            String matchStatus,
            int matchScore,
            String textPreview) {
    }

    private AnalysisResult buildAnalysis(ApplicationDetail application, String documentType,
                                         String filename, String contentType, byte[] content) {
        boolean shouldOcr = DocumentVerificationRules.shouldOcr(documentType);

        if (!shouldOcr) {
            return neutral(documentType, "NOT_REQUIRED",
                    notRequiredMatching(), "OCR non requis pour ce type de document.");
        }

        try {
            OcrExtraction extraction = ocr.extract(content, filename, contentType,
                    documentType, application.accountType());

            if (!extraction.available()) {
                String message = extraction.error() == null || extraction.error().isBlank()
                        ? "Service OCR indisponible." : extraction.error();
                return neutral(documentType, "OCR_UNAVAILABLE", notRequiredMatching(), message);
            }

            String rawText = extraction.rawText() == null ? "" : extraction.rawText();
            Map<String, Object> matching = routeMatching(documentType, rawText, application);
            int matchScore = intValue(matching.get("match_score"));
            String matchStatus = String.valueOf(matching.get("match_status"));
            int qualityScore = qualityScoreOf(extraction.quality());
            String verificationStatus =
                    DocumentVerificationRules.deriveVerificationStatus(true, matchStatus, matchScore, qualityScore);
            String ocrStatus = rawText.isBlank() ? "NO_TEXT_FOUND" : "TEXT_EXTRACTED";
            String textPreview = preview(rawText);

            Map<String, Object> ocrBlock = new LinkedHashMap<>();
            ocrBlock.put("engine", extraction.engine());
            ocrBlock.put("ocr_status", ocrStatus);
            ocrBlock.put("available", true);
            ocrBlock.put("text_length", rawText.length());
            ocrBlock.put("text", rawText);
            ocrBlock.put("duration_ms", extraction.durationMs());

            Map<String, Object> analysis = new LinkedHashMap<>();
            analysis.put("document_type", documentType);
            analysis.put("text_preview", textPreview);
            analysis.put("extracted_fields", extraction.fields() == null ? Map.of() : extraction.fields());
            analysis.put("quality_score", qualityScore);
            analysis.put("verification_status", verificationStatus);
            analysis.put("matching", matching);
            analysis.put("ocr", ocrBlock);
            analysis.put("quality", extraction.quality() == null ? Map.of() : extraction.quality());

            return new AnalysisResult(analysis, verificationStatus, qualityScore,
                    ocrStatus, matchStatus, matchScore, textPreview);

        } catch (Exception e) {
            log.warn("[OCR] analyse indisponible, repli neutre : {}", e.getMessage());
            return neutral(documentType, "OCR_UNAVAILABLE", notRequiredMatching(),
                    "Analyse OCR indisponible : " + e.getMessage());
        }
    }

    private Map<String, Object> routeMatching(String documentType, String rawText, ApplicationDetail application) {
        MatchingRoute route = DocumentVerificationRules.matchingRoute(documentType);
        return switch (route) {
            case RIB -> OcrMatching.matchRibWithApplication(rawText, application.rib());
            case INCOME -> OcrMatching.matchIncomeDocument(rawText);
            case IDENTITY -> OcrMatching.matchOcrWithApplication(rawText, new ApplicantIdentity(
                    application.lastName(),
                    application.firstName(),
                    application.birthName(),
                    application.identityDocumentNumber(),
                    application.birthDate() == null ? null : application.birthDate().toString()));
        };
    }

    /** Analyse neutre (OCR non requis ou indisponible) — upload non bloqué, .analysis.enc écrit. */
    private AnalysisResult neutral(String documentType, String ocrStatus,
                                   Map<String, Object> matching, String message) {
        int qualityScore = DocumentVerificationRules.NEUTRAL_QUALITY_SCORE;
        String matchStatus = String.valueOf(matching.get("match_status"));
        int matchScore = intValue(matching.get("match_score"));
        String verificationStatus =
                DocumentVerificationRules.deriveVerificationStatus(false, matchStatus, matchScore, qualityScore);

        Map<String, Object> ocrBlock = new LinkedHashMap<>();
        ocrBlock.put("engine", "unavailable");
        ocrBlock.put("ocr_status", ocrStatus);
        ocrBlock.put("available", false);
        ocrBlock.put("text_length", 0);
        ocrBlock.put("text", "");
        ocrBlock.put("message", message);

        Map<String, Object> analysis = new LinkedHashMap<>();
        analysis.put("document_type", documentType);
        analysis.put("text_preview", "");
        analysis.put("extracted_fields", Map.of());
        analysis.put("quality_score", qualityScore);
        analysis.put("verification_status", verificationStatus);
        analysis.put("matching", matching);
        analysis.put("ocr", ocrBlock);
        analysis.put("quality", Map.of());

        return new AnalysisResult(analysis, verificationStatus, qualityScore,
                ocrStatus, matchStatus, matchScore, "");
    }

    private static Map<String, Object> notRequiredMatching() {
        Map<String, Object> matching = new LinkedHashMap<>();
        matching.put("match_score", 0);
        matching.put("match_status", "NOT_REQUIRED");
        matching.put("checks", List.of());
        return matching;
    }

    private static int qualityScoreOf(Map<String, Object> quality) {
        if (quality != null && quality.get("score") instanceof Number number) {
            return Math.max(0, Math.min(100, number.intValue()));
        }
        return DocumentVerificationRules.NEUTRAL_QUALITY_SCORE;
    }

    private static int intValue(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private static String preview(String text) {
        if (text == null) {
            return "";
        }
        return text.length() > TEXT_PREVIEW_LIMIT ? text.substring(0, TEXT_PREVIEW_LIMIT) : text;
    }

    private byte[] toJsonBytes(Map<String, Object> analysis) {
        try {
            return objectMapper.writeValueAsBytes(analysis);
        } catch (Exception e) {
            throw ApiException.internal("Impossible de sérialiser l'analyse documentaire.");
        }
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
