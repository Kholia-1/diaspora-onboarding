package com.afriland.diaspora.application.port.out;

import java.util.List;
import java.util.Map;

/**
 * Stockage disque des fichiers de session pré-onboarding (PRE_ONBOARDING_UPLOAD_DIR).
 * Reproduit l'arborescence et les métadonnées JSON du legacy.
 */
public interface PreOnboardingStoragePort {

    /** Sauvegarde un fichier de session et retourne les métadonnées (mêmes clés que le legacy). */
    Map<String, Object> saveFile(String sessionId, String accountType, String documentType,
                                 String originalName, String contentType, byte[] content);

    /** Vue de session : documents capturés + champs OCR persistés. */
    SessionView readSession(String sessionId);

    record SessionView(String sessionId, boolean exists, List<Map<String, Object>> documents,
                       Map<String, Object> extractedFields) {
    }
}
