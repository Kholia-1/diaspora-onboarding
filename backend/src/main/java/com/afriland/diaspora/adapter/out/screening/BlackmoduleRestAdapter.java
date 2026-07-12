package com.afriland.diaspora.adapter.out.screening;

import com.afriland.diaspora.application.port.out.ScreeningPort;
import com.afriland.diaspora.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * Connecteur BLACKMODULE — parité fail-safe avec app/services/blackmodule_client.py :
 * ne lève JAMAIS d'exception ; URL via env BLACKMODULE_SCREENING_URL (sinon propriété
 * app.blackmodule.screening-url) ; indisponibilité → statut neutre A_VERIFIER.
 */
@Component
public class BlackmoduleRestAdapter implements ScreeningPort {

    private static final Logger log = LoggerFactory.getLogger(BlackmoduleRestAdapter.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final JsonMapper json = JsonMapper.builder().build();
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    private final AppProperties properties;

    public BlackmoduleRestAdapter(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public ScreeningResult screen(Map<String, Object> payload) {
        String url = screeningUrl();

        if (url == null || url.isBlank()) {
            return new ScreeningResult(
                    "BLACKMODULE_UNAVAILABLE",
                    0.0,
                    "A_VERIFIER",
                    "Variable BLACKMODULE_SCREENING_URL non configurée — revue manuelle requise.");
        }

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload),
                            StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                return new ScreeningResult(
                        "BLACKMODULE_ERROR",
                        0.0,
                        "A_VERIFIER",
                        "Erreur BLACKMODULE HTTP " + response.statusCode());
            }

            Map<?, ?> data = json.readValue(response.body(), Map.class);

            return new ScreeningResult(
                    stringOr(data.get("status"), "SCREENED"),
                    numberOrZero(data.get("score")),
                    stringOr(data.get("risk_level"), "FAIBLE"),
                    alertOrMessage(data));

        } catch (Exception e) {
            log.warn("[BLACKMODULE] indisponible : {}", e.getMessage());
            return new ScreeningResult(
                    "BLACKMODULE_UNAVAILABLE",
                    0.0,
                    "A_VERIFIER",
                    "BLACKMODULE indisponible : " + e.getMessage());
        }
    }

    private String screeningUrl() {
        String env = System.getenv("BLACKMODULE_SCREENING_URL");
        if (env != null && !env.isBlank()) {
            return env;
        }
        if (properties.blackmodule() != null) {
            return properties.blackmodule().screeningUrl();
        }
        return null;
    }

    private static String stringOr(Object value, String fallback) {
        return value == null ? fallback : String.valueOf(value);
    }

    private static Double numberOrZero(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0.0;
    }

    /** Parité data.get("alert") or data.get("message"). */
    private static String alertOrMessage(Map<?, ?> data) {
        Object alert = data.get("alert");
        if (alert != null && !String.valueOf(alert).isEmpty()) {
            return String.valueOf(alert);
        }
        Object message = data.get("message");
        return message == null ? null : String.valueOf(message);
    }
}
