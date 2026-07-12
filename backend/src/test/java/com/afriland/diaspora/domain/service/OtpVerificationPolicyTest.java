package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.model.PreOnboardingOtpSession;
import com.afriland.diaspora.domain.service.OtpVerificationPolicy.Decision;
import com.afriland.diaspora.domain.service.OtpVerificationPolicy.Result;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OtpVerificationPolicyTest {

    private static final String SECRET = "diaspora-onboarding-demo-secret-change-me";
    private static final String SESSION = "sess-1";
    private static final String PHONE = "+237653935666";
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 13, 12, 0);
    private static final int MAX_ATTEMPTS = 5;

    private static String hashOf(String otp) {
        return OtpHasher.hash(SECRET, SESSION, PHONE, otp);
    }

    private static PreOnboardingOtpSession session(String otp, int attempts, LocalDateTime expiresAt,
                                                   LocalDateTime verifiedAt) {
        return new PreOnboardingOtpSession(1L, SESSION, PHONE, hashOf(otp), attempts, verifiedAt,
                expiresAt, "UNKNOWN", null, NOW.minusMinutes(1), NOW.minusMinutes(1));
    }

    @Test
    void successWhenCodeMatchesAndFresh() {
        PreOnboardingOtpSession record = session("123456", 0, NOW.plusMinutes(9), null);
        Result result = OtpVerificationPolicy.evaluate(record, PHONE, hashOf("123456"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.SUCCESS, result.decision());
    }

    @Test
    void alreadyVerifiedShortCircuits() {
        PreOnboardingOtpSession record = session("123456", 0, NOW.plusMinutes(9), NOW.minusMinutes(2));
        Result result = OtpVerificationPolicy.evaluate(record, PHONE, hashOf("000000"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.ALREADY_VERIFIED, result.decision());
    }

    @Test
    void phoneMismatchTakesPrecedenceOverCode() {
        PreOnboardingOtpSession record = session("123456", 0, NOW.plusMinutes(9), null);
        Result result = OtpVerificationPolicy.evaluate(record, "+237600000000", hashOf("123456"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.PHONE_MISMATCH, result.decision());
    }

    @Test
    void expiredWhenPastTtl() {
        PreOnboardingOtpSession record = session("123456", 0, NOW.minusSeconds(1), null);
        Result result = OtpVerificationPolicy.evaluate(record, PHONE, hashOf("123456"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.EXPIRED, result.decision());
    }

    @Test
    void expiredWhenNoExpiry() {
        PreOnboardingOtpSession record = session("123456", 0, null, null);
        Result result = OtpVerificationPolicy.evaluate(record, PHONE, hashOf("123456"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.EXPIRED, result.decision());
    }

    @Test
    void maxAttemptsBlocksBeforeCodeCheck() {
        PreOnboardingOtpSession record = session("123456", MAX_ATTEMPTS, NOW.plusMinutes(9), null);
        // Même avec le bon code, la limite de tentatives est prioritaire.
        Result result = OtpVerificationPolicy.evaluate(record, PHONE, hashOf("123456"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.MAX_ATTEMPTS, result.decision());
    }

    @Test
    void incorrectCodeReportsRemainingAttempts() {
        PreOnboardingOtpSession record = session("123456", 1, NOW.plusMinutes(9), null);
        Result result = OtpVerificationPolicy.evaluate(record, PHONE, hashOf("000000"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.INCORRECT, result.decision());
        // attempts passe de 1 à 2 → restantes = 5 - 2 = 3.
        assertEquals(3, result.remainingAttempts());
    }

    @Test
    void incorrectCodeRemainingClampsAtZero() {
        PreOnboardingOtpSession record = session("123456", MAX_ATTEMPTS - 1, NOW.plusMinutes(9), null);
        Result result = OtpVerificationPolicy.evaluate(record, PHONE, hashOf("999999"), NOW, MAX_ATTEMPTS);
        assertEquals(Decision.INCORRECT, result.decision());
        assertEquals(0, result.remainingAttempts());
    }
}
