package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

/**
 * Session OTP de pré-onboarding — persistée dans la table pre_onboarding_sessions.
 * Seul le hash de l'OTP est stocké (jamais le code en clair). `verified` est dérivé
 * de verifiedAt (parité avec le champ "verified" du store JSON legacy).
 */
public record PreOnboardingOtpSession(
        Long id,
        String sessionId,
        String phone,
        String otpHash,
        int attempts,
        LocalDateTime verifiedAt,
        LocalDateTime expiresAt,
        String deliveryStatus,
        String deliveryMessageUuid,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public boolean verified() {
        return verifiedAt != null;
    }

    public PreOnboardingOtpSession withAttempts(int newAttempts, LocalDateTime updatedAt) {
        return new PreOnboardingOtpSession(id, sessionId, phone, otpHash, newAttempts, verifiedAt,
                expiresAt, deliveryStatus, deliveryMessageUuid, createdAt, updatedAt);
    }

    public PreOnboardingOtpSession withVerified(LocalDateTime verifiedAt) {
        return new PreOnboardingOtpSession(id, sessionId, phone, otpHash, attempts, verifiedAt,
                expiresAt, deliveryStatus, deliveryMessageUuid, createdAt, verifiedAt);
    }
}
