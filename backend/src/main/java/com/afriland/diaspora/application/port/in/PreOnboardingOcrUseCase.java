package com.afriland.diaspora.application.port.in;

import java.util.Map;

public interface PreOnboardingOcrUseCase {

    /** OCR d'un document de pré-onboarding (délégué au microservice OCR, fail-safe). */
    Map<String, Object> runOcr(String accountType, String documentType, String sessionId,
                               String filename, String contentType, byte[] content);

    /** Sauvegarde d'un fichier de session, retourne les métadonnées. */
    Map<String, Object> saveFile(String sessionId, String accountType, String documentType,
                                 String filename, String contentType, byte[] content);

    /** État de la session (documents + champs OCR). */
    Map<String, Object> getSession(String sessionId);
}
