package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.PreOnboardingOcrUseCase;
import com.afriland.diaspora.application.port.out.OcrPort;
import com.afriland.diaspora.application.port.out.OcrPort.OcrExtraction;
import com.afriland.diaspora.application.port.out.PreOnboardingStoragePort;
import com.afriland.diaspora.application.port.out.PreOnboardingStoragePort.SessionView;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class PreOnboardingOcrService implements PreOnboardingOcrUseCase {

    private static final int TEXT_PREVIEW_LIMIT = 1200;

    private final OcrPort ocr;
    private final PreOnboardingStoragePort storage;

    public PreOnboardingOcrService(OcrPort ocr, PreOnboardingStoragePort storage) {
        this.ocr = ocr;
        this.storage = storage;
    }

    @Override
    public Map<String, Object> runOcr(String accountType, String documentType, String sessionId,
                                      String filename, String contentType, byte[] content) {
        if (content == null || content.length == 0) {
            throw ApiException.badRequest("Fichier vide.");
        }

        String mimeType = contentType == null || contentType.isEmpty()
                ? "application/octet-stream"
                : contentType;

        OcrExtraction extraction = ocr.extract(content, filename, mimeType, documentType, accountType);

        String rawText = extraction.rawText() == null ? "" : extraction.rawText();
        String textPreview = rawText.length() > TEXT_PREVIEW_LIMIT
                ? rawText.substring(0, TEXT_PREVIEW_LIMIT)
                : rawText;

        Map<String, Object> response = new LinkedHashMap<>();
        // Fail-safe non bloquant : service OCR indisponible → statut dégradé, parcours poursuivi.
        response.put("status", extraction.available() ? "OK" : "OCR_UNAVAILABLE");
        response.put("account_type", accountType);
        response.put("document_type", documentType);
        response.put("filename", filename);
        response.put("mime_type", mimeType);
        response.put("engine", extraction.engine());
        response.put("ocr_available", extraction.available());
        response.put("ocr_error", extraction.error());
        response.put("text_length", rawText.length());
        response.put("text_preview", textPreview);
        response.put("quality", extraction.quality());
        response.put("extracted_fields", extraction.fields());
        response.put("duration_ms", extraction.durationMs());

        return response;
    }

    @Override
    public Map<String, Object> saveFile(String sessionId, String accountType, String documentType,
                                        String filename, String contentType, byte[] content) {
        return storage.saveFile(sessionId, accountType, documentType, filename, contentType, content);
    }

    @Override
    public Map<String, Object> getSession(String sessionId) {
        SessionView view = storage.readSession(sessionId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("session_id", view.sessionId());
        response.put("exists", view.exists());
        response.put("documents_count", view.documents().size());
        response.put("documents", view.documents());
        response.put("extracted_fields", view.extractedFields());
        return response;
    }
}
