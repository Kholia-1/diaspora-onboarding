package com.afriland.diaspora.application.port.in;

import java.util.Map;

/** Configuration back-office éditable : packages et intégrations API. */
public interface ManageBackofficeConfigUseCase {

    Map<String, Object> getPackages();

    Map<String, Object> savePackages(Map<String, Object> payload, String actor, String ipAddress, String userAgent);

    /** Intégrations avec secrets MASQUÉS (parité public_integration_payload). */
    Map<String, Object> getApiIntegrations();

    Map<String, Object> saveApiIntegrations(Map<String, Object> payload, String actor,
                                            String ipAddress, String userAgent);

    /** Test de connexion d'une intégration (fail-safe). */
    Map<String, Object> testIntegration(String integrationCode);
}
