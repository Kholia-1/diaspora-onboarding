package com.afriland.diaspora.application.port.in;

import java.util.Map;

public interface PreOnboardingOtpUseCase {

    /** Génère, persiste (hashé) et « envoie » un OTP. Payload de retour identique au legacy. */
    Map<String, Object> sendOtp(Map<String, Object> payload);

    /** Vérifie l'OTP (TTL, tentatives, correspondance téléphone). */
    Map<String, Object> verifyOtp(Map<String, Object> payload);

    /** Statut public de l'OTP d'une session. */
    Map<String, Object> otpStatus(String sessionId);

    /** Statut de livraison WhatsApp (statique en Phase 3, polling Callbell en Phase 4). */
    Map<String, Object> deliveryStatus(String sessionId);
}
