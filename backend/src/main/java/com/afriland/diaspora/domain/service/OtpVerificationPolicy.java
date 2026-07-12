package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.model.PreOnboardingOtpSession;

import java.time.LocalDateTime;

/**
 * Décision de vérification d'un OTP — logique pure, parité stricte avec verify_pre_onboarding_otp.
 * Ordre des contrôles : déjà vérifié → téléphone → expiration → tentatives max → code.
 */
public final class OtpVerificationPolicy {

    private OtpVerificationPolicy() {
    }

    public enum Decision {
        ALREADY_VERIFIED,
        PHONE_MISMATCH,
        EXPIRED,
        MAX_ATTEMPTS,
        INCORRECT,
        SUCCESS
    }

    /**
     * @param remainingAttempts renseigné pour INCORRECT (tentatives restantes après incrément).
     */
    public record Result(Decision decision, int remainingAttempts) {
    }

    public static Result evaluate(PreOnboardingOtpSession record, String providedPhone, String providedOtpHash,
                                  LocalDateTime now, int maxAttempts) {
        if (record.verified()) {
            return new Result(Decision.ALREADY_VERIFIED, 0);
        }

        if (!safe(record.phone()).equals(safe(providedPhone))) {
            return new Result(Decision.PHONE_MISMATCH, 0);
        }

        LocalDateTime expiresAt = record.expiresAt();
        if (expiresAt == null || expiresAt.isBefore(now)) {
            return new Result(Decision.EXPIRED, 0);
        }

        if (record.attempts() >= maxAttempts) {
            return new Result(Decision.MAX_ATTEMPTS, 0);
        }

        if (!OtpHasher.constantTimeEquals(record.otpHash(), providedOtpHash)) {
            int newAttempts = record.attempts() + 1;
            return new Result(Decision.INCORRECT, Math.max(0, maxAttempts - newAttempts));
        }

        return new Result(Decision.SUCCESS, 0);
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
