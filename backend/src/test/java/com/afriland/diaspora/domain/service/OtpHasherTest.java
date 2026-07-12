package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OtpHasherTest {

    private static final String SECRET = "diaspora-onboarding-demo-secret-change-me";

    @Test
    void matchesRealPythonVector() {
        // Vecteur généré avec :
        // python -c "import hashlib; print(hashlib.sha256(
        //   'diaspora-onboarding-demo-secret-change-me|sess-1|+237653935666|123456'.encode()).hexdigest())"
        String expected = "c7fad08e1d2b1e31e627beb1033eaceec538c7eeacb60262b89cdbe9879d7437";

        assertEquals(expected, OtpHasher.hash(SECRET, "sess-1", "+237653935666", "123456"));
    }

    @Test
    void differentInputsProduceDifferentHashes() {
        String base = OtpHasher.hash(SECRET, "sess-1", "+237653935666", "123456");
        assertFalse(base.equals(OtpHasher.hash(SECRET, "sess-1", "+237653935666", "123457")));
        assertFalse(base.equals(OtpHasher.hash(SECRET, "sess-2", "+237653935666", "123456")));
        assertFalse(base.equals(OtpHasher.hash(SECRET, "sess-1", "+237600000000", "123456")));
    }

    @Test
    void constantTimeEqualsHandlesNullsAndMatches() {
        String hash = OtpHasher.hash(SECRET, "sess-1", "+237653935666", "123456");
        assertTrue(OtpHasher.constantTimeEquals(hash, hash));
        assertFalse(OtpHasher.constantTimeEquals(hash, "autre"));
        assertFalse(OtpHasher.constantTimeEquals(null, hash));
        assertFalse(OtpHasher.constantTimeEquals(hash, null));
    }
}
