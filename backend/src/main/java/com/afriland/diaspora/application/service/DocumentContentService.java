package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.ReadDocumentUseCase;
import com.afriland.diaspora.application.port.out.DocumentCryptoPort;
import com.afriland.diaspora.application.port.out.DocumentRepositoryPort;
import com.afriland.diaspora.application.port.out.DocumentStoragePort;
import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class DocumentContentService implements ReadDocumentUseCase {

    /** Types média sans analyse OCR (parité APPLICATION_DOCUMENT_ANALYSIS_MEDIA_GUARD_V1). */
    private static final Set<String> MEDIA_ONLY_TYPES =
            Set.of("CLIENT_PHOTO", "CLIENT_VIDEO", "SELFIE_PHOTO", "SELFIE_VIDEO");

    private final DocumentRepositoryPort documents;
    private final DocumentStoragePort storage;
    private final DocumentCryptoPort crypto;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DocumentContentService(DocumentRepositoryPort documents, DocumentStoragePort storage,
                                  DocumentCryptoPort crypto) {
        this.documents = documents;
        this.storage = storage;
        this.crypto = crypto;
    }

    @Override
    public DocumentContent getDocumentContent(long documentId) {
        ApplicationDocumentInfo document = documents.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Document introuvable"));

        byte[] raw = storage.read(document.filePath())
                .orElseThrow(() -> ApiException.notFound("Fichier document introuvable"));

        // APPLICATION_DOCUMENT_CONTENT_PLAIN_OR_ENCRYPTED_V1
        // Fichiers .enc (upload classique chiffré) ou dont le contenu est un token Fernet : à déchiffrer.
        // Autres fichiers (copiés du pré-onboarding) : déjà en clair.
        String filePath = document.filePath() == null ? "" : document.filePath();
        boolean encrypted = filePath.toLowerCase(Locale.ROOT).endsWith(".enc") || crypto.looksEncrypted(raw);

        byte[] content;
        if (encrypted) {
            try {
                content = crypto.decrypt(raw);
            } catch (Exception e) {
                throw ApiException.internal("Impossible de déchiffrer le document");
            }
        } else {
            content = raw;
        }

        String mimeType = document.mimeType() == null || document.mimeType().isEmpty()
                ? "application/octet-stream"
                : document.mimeType();
        String filename = document.originalFilename() == null || document.originalFilename().isEmpty()
                ? "document"
                : document.originalFilename();

        return new DocumentContent(content, mimeType, filename);
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDocumentAnalysis(long documentId) {
        ApplicationDocumentInfo document = documents.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Document introuvable"));

        // APPLICATION_DOCUMENT_ANALYSIS_MEDIA_GUARD_V1 : photos/vidéos de preuve de vie
        // n'ont pas d'analyse OCR.
        String type = document.documentType() == null ? "" : document.documentType().toUpperCase(Locale.ROOT);
        String mime = document.mimeType() == null ? "" : document.mimeType().toLowerCase(Locale.ROOT);
        if (MEDIA_ONLY_TYPES.contains(type) || mime.startsWith("video/")) {
            throw ApiException.badRequest("Analyse OCR non disponible pour ce type de document.");
        }

        String analysisPath = (document.filePath() == null ? "" : document.filePath()) + ".analysis.enc";
        byte[] raw = storage.read(analysisPath)
                .orElseThrow(() -> ApiException.notFound("Analyse documentaire introuvable"));

        Map<String, Object> analysis;
        try {
            byte[] decrypted = crypto.decrypt(raw);
            Object parsed = objectMapper.readValue(decrypted, Map.class);
            analysis = parsed instanceof Map ? (Map<String, Object>) parsed : new LinkedHashMap<>();
        } catch (Exception e) {
            throw ApiException.internal("Impossible de lire l’analyse documentaire");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("document_id", document.id());
        response.put("document_type", document.documentType());
        response.put("verification_status", document.verificationStatus());
        response.put("quality_score", document.qualityScore());
        response.put("analysis", analysis);
        return response;
    }
}
