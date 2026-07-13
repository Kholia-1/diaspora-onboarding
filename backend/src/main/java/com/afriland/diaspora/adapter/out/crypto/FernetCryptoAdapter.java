package com.afriland.diaspora.adapter.out.crypto;

import com.afriland.diaspora.application.port.out.DocumentCryptoPort;
import com.afriland.diaspora.config.AppProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;

/**
 * Déchiffrement Fernet implémenté à la main (pas de dépendance externe) :
 * token = base64url( 0x80 | timestamp 8o | IV 16o | ciphertext AES-128-CBC | HMAC-SHA256 32o ),
 * clé = base64url de 32 octets → 16 octets de signature + 16 octets de chiffrement.
 * Le TTL n'est pas vérifié (parité avec cryptography.fernet.decrypt sans ttl).
 */
@Component
public class FernetCryptoAdapter implements DocumentCryptoPort {

    private static final byte[] FERNET_PREFIX = "gAAAA".getBytes(StandardCharsets.US_ASCII);

    private final AppProperties properties;
    private final SecureRandom random = new SecureRandom();

    private volatile byte[] signingKey;
    private volatile byte[] encryptionKey;

    public FernetCryptoAdapter(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public byte[] encrypt(byte[] plaintext) {
        loadKeyIfNeeded();

        byte[] data = plaintext == null ? new byte[0] : plaintext;

        try {
            byte[] iv = new byte[16];
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(encryptionKey, "AES"), new IvParameterSpec(iv));
            byte[] ciphertext = cipher.doFinal(data);

            long timestamp = Instant.now().getEpochSecond();
            ByteBuffer message = ByteBuffer.allocate(1 + 8 + iv.length + ciphertext.length);
            message.put((byte) 0x80);
            message.putLong(timestamp);
            message.put(iv);
            message.put(ciphertext);
            byte[] messageBytes = message.array();

            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
            byte[] hmac = mac.doFinal(messageBytes);

            byte[] token = Arrays.copyOf(messageBytes, messageBytes.length + hmac.length);
            System.arraycopy(hmac, 0, token, messageBytes.length, hmac.length);

            return Base64.getUrlEncoder().encode(token);
        } catch (Exception e) {
            throw new IllegalStateException("Échec du chiffrement Fernet", e);
        }
    }

    @Override
    public byte[] decrypt(byte[] token) {
        loadKeyIfNeeded();

        byte[] raw = Base64.getUrlDecoder().decode(sanitizeToken(token));

        if (raw.length < 1 + 8 + 16 + 32 || raw[0] != (byte) 0x80) {
            throw new IllegalArgumentException("Token Fernet invalide");
        }

        int hmacOffset = raw.length - 32;

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
            mac.update(raw, 0, hmacOffset);
            byte[] expected = mac.doFinal();
            byte[] provided = Arrays.copyOfRange(raw, hmacOffset, raw.length);

            if (!MessageDigest.isEqual(expected, provided)) {
                throw new IllegalArgumentException("Signature Fernet invalide");
            }

            byte[] iv = Arrays.copyOfRange(raw, 9, 25);
            byte[] ciphertext = Arrays.copyOfRange(raw, 25, hmacOffset);

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(encryptionKey, "AES"), new IvParameterSpec(iv));
            return cipher.doFinal(ciphertext);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Échec du déchiffrement Fernet", e);
        }
    }

    @Override
    public boolean looksEncrypted(byte[] raw) {
        if (raw == null || raw.length < FERNET_PREFIX.length) {
            return false;
        }
        for (int i = 0; i < FERNET_PREFIX.length; i++) {
            if (raw[i] != FERNET_PREFIX[i]) {
                return false;
            }
        }
        return true;
    }

    /** Le fichier stocké contient le token base64url en ASCII ; on retire les blancs de fin éventuels. */
    private static byte[] sanitizeToken(byte[] token) {
        int end = token.length;
        while (end > 0 && (token[end - 1] == '\n' || token[end - 1] == '\r'
                || token[end - 1] == ' ' || token[end - 1] == '\t')) {
            end--;
        }
        return end == token.length ? token : Arrays.copyOf(token, end);
    }

    private void loadKeyIfNeeded() {
        if (signingKey != null) {
            return;
        }
        synchronized (this) {
            if (signingKey != null) {
                return;
            }

            String keyText = System.getenv("FERNET_KEY");
            if (keyText == null || keyText.isBlank()) {
                Path keyFile = Path.of(properties.fernet().keyFile());
                try {
                    keyText = Files.readString(keyFile, StandardCharsets.US_ASCII).strip();
                } catch (Exception e) {
                    throw new IllegalStateException(
                            "Clé Fernet introuvable : ni variable d'environnement FERNET_KEY, ni fichier " + keyFile, e);
                }
            }

            byte[] key = Base64.getUrlDecoder().decode(keyText.strip());
            if (key.length != 32) {
                throw new IllegalStateException("Clé Fernet invalide : 32 octets attendus après décodage base64url");
            }

            encryptionKey = Arrays.copyOfRange(key, 16, 32);
            signingKey = Arrays.copyOfRange(key, 0, 16);
        }
    }
}
