package com.afriland.diaspora.adapter.out.security;

import com.afriland.diaspora.application.port.out.PasswordHasherPort;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * Réplique exacte de hash_password/verify_password du back-office Python :
 * format "salt$hexdigest", PBKDF2-HMAC-SHA256, 200 000 itérations, dklen 32.
 * Le sel est une chaîne de 32 caractères hexadécimaux ; côté dérivation il est
 * utilisé comme octets UTF-8 de la chaîne (PAS décodé en binaire) — parité
 * avec salt.encode("utf-8") côté Python.
 */
@Component
public class Pbkdf2PythonPasswordHasher implements PasswordHasherPort {

    private static final int ITERATIONS = 200_000;
    private static final int KEY_LENGTH_BITS = 256; // dklen = 32 octets

    private final SecureRandom random = new SecureRandom();

    @Override
    public String encode(String rawPassword) {
        byte[] saltBytes = new byte[16];
        random.nextBytes(saltBytes);
        String salt = HexFormat.of().formatHex(saltBytes); // 32 caractères hex
        return salt + "$" + digestHex(rawPassword, salt);
    }

    @Override
    public boolean matches(String rawPassword, String storedHash) {
        if (rawPassword == null || storedHash == null) {
            return false;
        }
        int separator = storedHash.indexOf('$');
        if (separator < 0) {
            return false;
        }
        String salt = storedHash.substring(0, separator);
        String candidate = salt + "$" + digestHex(rawPassword, salt);
        return MessageDigest.isEqual(
                candidate.getBytes(StandardCharsets.UTF_8),
                storedHash.getBytes(StandardCharsets.UTF_8));
    }

    private static String digestHex(String password, String salt) {
        try {
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            PBEKeySpec spec = new PBEKeySpec(
                    password.toCharArray(),
                    salt.getBytes(StandardCharsets.UTF_8),
                    ITERATIONS,
                    KEY_LENGTH_BITS);
            byte[] derived = factory.generateSecret(spec).getEncoded();
            return HexFormat.of().formatHex(derived);
        } catch (Exception e) {
            throw new IllegalStateException("PBKDF2 indisponible", e);
        }
    }
}
