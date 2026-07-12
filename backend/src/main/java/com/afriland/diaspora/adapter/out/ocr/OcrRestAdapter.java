package com.afriland.diaspora.adapter.out.ocr;

import com.afriland.diaspora.application.port.out.OcrPort;
import com.afriland.diaspora.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

/**
 * Appelle le microservice OCR (POST /v1/ocr/extract) — parité avec l'architecture
 * cible (OcrPort). Fail-safe : toute erreur/indisponibilité retourne available=false
 * sans lever d'exception (le parcours client n'est jamais bloqué).
 */
@Component
public class OcrRestAdapter implements OcrPort {

    private static final Logger log = LoggerFactory.getLogger(OcrRestAdapter.class);

    private final RestClient restClient;
    private final String apiKey;

    public OcrRestAdapter(AppProperties properties) {
        AppProperties.Ocr ocr = properties.ocr();
        String baseUrl = ocr != null && ocr.baseUrl() != null && !ocr.baseUrl().isBlank()
                ? ocr.baseUrl()
                : "http://127.0.0.1:8020";
        int timeoutSeconds = ocr != null && ocr.timeoutSeconds() > 0 ? ocr.timeoutSeconds() : 30;
        this.apiKey = ocr != null ? ocr.apiKey() : null;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    @Override
    public OcrExtraction extract(byte[] content, String filename, String contentType,
                                 String documentType, String accountType) {
        try {
            ByteArrayResource fileResource = new ByteArrayResource(content) {
                @Override
                public String getFilename() {
                    return filename != null ? filename : "capture";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", fileResource);
            body.add("document_type", documentType == null ? "UNKNOWN" : documentType);
            body.add("account_type", accountType == null ? "" : accountType);

            Map<?, ?> response = restClient.post()
                    .uri("/v1/ocr/extract")
                    .header("X-API-Key", apiKey == null ? "" : apiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return unavailable("Réponse OCR vide.");
            }

            return new OcrExtraction(
                    asString(response.get("raw_text")),
                    asMap(response.get("fields")),
                    asMap(response.get("quality")),
                    asString(response.get("engine")),
                    asInteger(response.get("duration_ms")),
                    true,
                    null);

        } catch (Exception e) {
            log.warn("[OCR] microservice indisponible : {}", e.getMessage());
            return unavailable("Service OCR indisponible : " + e.getMessage());
        }
    }

    private static OcrExtraction unavailable(String error) {
        return new OcrExtraction("", Map.of(), Map.of(), "unavailable", null, false, error);
    }

    private static String asString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    private static Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return null;
    }
}
