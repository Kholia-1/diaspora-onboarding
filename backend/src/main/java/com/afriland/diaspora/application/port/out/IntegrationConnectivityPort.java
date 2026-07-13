package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Test de connectivité HTTP d'une intégration — parité safe_http_connectivity_test.
 * Fail-safe : ne lève jamais d'exception.
 */
public interface IntegrationConnectivityPort {

    /** Retourne {attempted, success, [http_status], message}. */
    Map<String, Object> test(String baseUrl);
}
