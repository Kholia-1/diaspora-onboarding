package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IntegrationNormalizerTest {

    @Test
    void maskSecretValueParity() {
        assertEquals("", IntegrationNormalizer.maskSecretValue(null));
        assertEquals("", IntegrationNormalizer.maskSecretValue(""));
        assertEquals("******", IntegrationNormalizer.maskSecretValue("abc"));
        assertEquals("******", IntegrationNormalizer.maskSecretValue("abcdef")); // len 6
        assertEquals("abc******efg", IntegrationNormalizer.maskSecretValue("abcdefg")); // len 7
        assertEquals("a5e******b00",
                IntegrationNormalizer.maskSecretValue("a5ef1003ecfa0c54be51bb797fee6b00"));
    }

    @Test
    void publicPayloadMasksOnlyPresentSecretFields() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("code", "MASTERCARD");
        item.put("api_key", "a5ef1003ecfa0c54be51bb797fee6b00");
        item.put("client_secret", "supersecretvalue");
        item.put("merchant_id", "001020345");

        Map<String, Object> masked = IntegrationNormalizer.publicPayload(item);

        assertEquals("a5e******b00", masked.get("api_key"));
        assertEquals("sup******lue", masked.get("client_secret"));
        // Champ non secret conservé en clair.
        assertEquals("001020345", masked.get("merchant_id"));
        // access_token absent → non ajouté.
        assertFalse(masked.containsKey("access_token"));
        // La copie ne modifie pas l'original.
        assertEquals("a5ef1003ecfa0c54be51bb797fee6b00", item.get("api_key"));
    }

    @Test
    void isBlankOrMaskedDetectsEmptyAndMasked() {
        assertTrue(IntegrationNormalizer.isBlankOrMasked(null));
        assertTrue(IntegrationNormalizer.isBlankOrMasked("   "));
        assertTrue(IntegrationNormalizer.isBlankOrMasked("abc******def"));
        assertFalse(IntegrationNormalizer.isBlankOrMasked("realsecret"));
    }

    @Test
    void normalizeAppliesDefaultsAndUppercases() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("code", "whatsapp");
        item.put("base_url", "https://api.callbell.eu");

        Map<String, Object> normalized = IntegrationNormalizer.normalize(item);

        assertEquals("WHATSAPP", normalized.get("code"));
        assertEquals("WHATSAPP", normalized.get("name")); // name défaut = code
        assertEquals("SANDBOX", normalized.get("environment"));
        assertEquals("API_KEY", normalized.get("auth_type"));
        assertEquals(false, normalized.get("enabled"));
        assertEquals("", normalized.get("api_key"));
        assertEquals("https://api.callbell.eu", normalized.get("base_url"));
    }
}
