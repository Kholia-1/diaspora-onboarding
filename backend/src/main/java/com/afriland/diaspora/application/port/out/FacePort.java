package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Accès au microservice de reconnaissance faciale (POST /v1/face/verify du
 * ocr-service). Fail-safe : ne lève jamais d'exception liée à l'indisponibilité
 * du service — retourne alors available=false (le parcours n'est pas bloqué).
 */
public interface FacePort {

    FaceVerification verify(byte[] video, String videoName,
                            byte[] selfie, String selfieName,
                            byte[] cni, String cniName);

    /**
     * @param result payload complet renvoyé par le service (paires, qualité,
     *               liveness, reasons…) — transmis tel quel au front.
     */
    record FaceVerification(
            boolean available,
            boolean match,
            Double confidence,
            String recognizer,
            Map<String, Object> result,
            String error) {
    }
}
