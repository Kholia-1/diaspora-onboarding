package com.afriland.diaspora.domain.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Hachage de l'OTP — parité stricte avec _otp_hash du legacy :
 * sha256(f"{secret}|{session_id}|{phone}|{otp}").hexdigest().
 */
public final class OtpHasher {

    private OtpHasher() {
    }

    public static String hash(String secret, String sessionId, String phone, String otp) {
        String raw = secret + "|" + sessionId + "|" + phone + "|" + otp;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
    }

    /** Comparaison à temps constant (parité secrets.compare_digest). */
    public static boolean constantTimeEquals(String expected, String provided) {
        if (expected == null || provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }
}
