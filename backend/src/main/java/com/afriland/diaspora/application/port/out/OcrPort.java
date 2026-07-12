package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Accès au microservice OCR (POST /v1/ocr/extract). Fail-safe : ne lève jamais
 * d'exception liée à l'indisponibilité du service — retourne alors available=false.
 */
public interface OcrPort {

    OcrExtraction extract(byte[] content, String filename, String contentType,
                          String documentType, String accountType);

    record OcrExtraction(
            String rawText,
            Map<String, Object> fields,
            Map<String, Object> quality,
            String engine,
            Integer durationMs,
            boolean available,
            String error) {
    }
}
