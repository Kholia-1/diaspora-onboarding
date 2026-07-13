package com.afriland.diaspora.adapter.out.config;

import com.afriland.diaspora.application.port.out.IntegrationConnectivityPort;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Test de connectivité HTTP GET — parité safe_http_connectivity_test
 * (app/routers/api_integration_tests.py). Fail-safe, timeout 5s.
 */
@Component
public class HttpConnectivityAdapter implements IntegrationConnectivityPort {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final Set<Integer> REACHABLE_ERROR_STATUSES = Set.of(401, 403, 404, 405);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Override
    public Map<String, Object> test(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return result(false, false, null, "Aucune URL de base renseignée.");
        }

        String lower = baseUrl.toLowerCase(Locale.ROOT);
        if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
            return result(false, false, null, "L’URL doit commencer par http:// ou https://.");
        }

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl))
                    .timeout(TIMEOUT)
                    .header("User-Agent", "Diaspora-Onboarding-Integration-Test/1.0")
                    .GET()
                    .build();

            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            int status = response.statusCode();

            if (status >= 400) {
                if (REACHABLE_ERROR_STATUSES.contains(status)) {
                    return result(true, true, status,
                            "Le serveur répond avec le statut " + status
                                    + ". L’API est joignable, mais nécessite une authentification "
                                    + "ou une route métier précise.");
                }
                return result(true, false, status, "Erreur HTTP : " + status + ".");
            }

            return result(true, true, status, "Connexion HTTP réussie avec le statut " + status + ".");

        } catch (Exception e) {
            return result(true, false, null, "Connexion impossible : " + e.getMessage());
        }
    }

    private static Map<String, Object> result(boolean attempted, boolean success, Integer httpStatus,
                                               String message) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("attempted", attempted);
        map.put("success", success);
        if (httpStatus != null) {
            map.put("http_status", httpStatus);
        }
        map.put("message", message);
        return map;
    }
}
