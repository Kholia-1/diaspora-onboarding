package com.afriland.diaspora.adapter.out.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Pbkdf2PythonPasswordHasherTest {

    private final Pbkdf2PythonPasswordHasher hasher = new Pbkdf2PythonPasswordHasher();

    @Test
    void encodeThenMatchesRoundTrip() {
        String hash = hasher.encode("MonMotDePasse@2026");

        assertTrue(hasher.matches("MonMotDePasse@2026", hash));
        assertFalse(hasher.matches("mauvais-mot-de-passe", hash));

        String[] parts = hash.split("\\$", 2);
        assertEquals(2, parts.length);
        assertEquals(32, parts[0].length(), "le sel doit faire 32 caractères hexadécimaux");
        assertTrue(parts[0].matches("^[0-9a-f]{32}$"));
        assertEquals(64, parts[1].length(), "le digest doit faire 64 caractères hexadécimaux (32 octets)");
        assertTrue(parts[1].matches("^[0-9a-f]{64}$"));
    }

    @Test
    void matchesRealPythonVector() {
        // Vecteur généré avec :
        // python -c "import hashlib; print(hashlib.pbkdf2_hmac('sha256', b'Admin@2026',
        //            b'abababababababababababababababab', 200000).hex())"
        String stored = "abababababababababababababababab"
                + "$cfb39fa8d031203515926a791934a8330b5aa02f135745546d16961cb9a39b8d";

        assertTrue(hasher.matches("Admin@2026", stored));
        assertFalse(hasher.matches("Admin@2025", stored));
    }

    @Test
    void rejectsMalformedStoredHash() {
        assertFalse(hasher.matches("Admin@2026", "pas-de-separateur"));
        assertFalse(hasher.matches("Admin@2026", null));
        assertFalse(hasher.matches(null, "abab$cdcd"));
    }
}
