package com.afriland.diaspora.adapter.out.face;

import com.afriland.diaspora.application.port.out.FacePort;
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
 * Appelle le microservice de reconnaissance faciale (POST /v1/face/verify) —
 * hébergé par le ocr-service (même service Python, même clé). Fail-safe : toute
 * erreur/indisponibilité retourne available=false sans lever d'exception.
 */
@Component
public class FaceRestAdapter implements FacePort {

    private static final Logger log = LoggerFactory.getLogger(FaceRestAdapter.class);

    // Le traitement vidéo (décodage + ArcFace sur plusieurs frames, CPU) est plus
    // lent que l'OCR : timeout dédié plus large.
    private static final int TIMEOUT_SECONDS = 120;

    private final RestClient restClient;
    private final String apiKey;

    public FaceRestAdapter(AppProperties properties) {
        AppProperties.Ocr ocr = properties.ocr();
        String baseUrl = ocr != null && ocr.baseUrl() != null && !ocr.baseUrl().isBlank()
                ? ocr.baseUrl()
                : "http://127.0.0.1:8020";
        this.apiKey = ocr != null ? ocr.apiKey() : null;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(30));
        factory.setReadTimeout(Duration.ofSeconds(TIMEOUT_SECONDS));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    @Override
    public FaceVerification verify(byte[] video, String videoName,
                                   byte[] selfie, String selfieName,
                                   byte[] cni, String cniName) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            addPart(body, "video", video, videoName, "capture.webm");
            addPart(body, "selfie", selfie, selfieName, "selfie.jpg");
            addPart(body, "cni", cni, cniName, "cni.jpg");

            if (body.isEmpty()) {
                return unavailable("Aucune source faciale fournie.");
            }

            Map<?, ?> response = restClient.post()
                    .uri("/v1/face/verify")
                    .header("X-API-Key", apiKey == null ? "" : apiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return unavailable("Réponse du service facial vide.");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) response;

            boolean match = Boolean.TRUE.equals(result.get("match"));
            Double confidence = asDouble(result.get("confidence"));
            String recognizer = result.get("recognizer") == null ? null : String.valueOf(result.get("recognizer"));

            return new FaceVerification(true, match, confidence, recognizer, result, null);

        } catch (Exception e) {
            log.warn("[FACE] microservice indisponible : {}", e.getMessage());
            return unavailable("Service de reconnaissance faciale indisponible : " + e.getMessage());
        }
    }

    private static void addPart(MultiValueMap<String, Object> body, String name,
                                byte[] content, String filename, String fallback) {
        if (content == null || content.length == 0) {
            return;
        }
        body.add(name, new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename != null && !filename.isBlank() ? filename : fallback;
            }
        });
    }

    private static FaceVerification unavailable(String error) {
        return new FaceVerification(false, false, null, null, Map.of(), error);
    }

    private static Double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return null;
    }
}
