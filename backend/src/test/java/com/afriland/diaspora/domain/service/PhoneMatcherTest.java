package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhoneMatcherTest {

    @Test
    void digitsOnlyStripsFormatting() {
        assertEquals("237653935666", PhoneMatcher.digitsOnly("+237 653-93-56-66"));
        assertEquals("", PhoneMatcher.digitsOnly(null));
        assertEquals("", PhoneMatcher.digitsOnly("abc"));
    }

    @Test
    void matchesIgnoresCountryCodeAndFormatting() {
        // Recherche du numéro local contre le numéro stocké au format international.
        assertTrue(PhoneMatcher.matches("+237 653 93 56 66", PhoneMatcher.digitsOnly("653935666")));
        // Recherche au format international contre un numéro stocké au format local.
        assertTrue(PhoneMatcher.matches("653935666", PhoneMatcher.digitsOnly("+237653935666")));
        // Préfixe 00237.
        assertTrue(PhoneMatcher.matches("00237653935666", PhoneMatcher.digitsOnly("653 93 56 66")));
    }

    @Test
    void comparesAtMostNineTrailingDigits() {
        // Les 9 derniers chiffres coïncident, les indicatifs diffèrent : match (parité tail=9).
        assertTrue(PhoneMatcher.matches("+237653935666", PhoneMatcher.digitsOnly("+33653935666")));
    }

    @Test
    void rejectsWhenFewerThanEightCommonDigits() {
        assertFalse(PhoneMatcher.matches("6539356", PhoneMatcher.digitsOnly("6539356")));
        assertFalse(PhoneMatcher.matches(null, "653935666"));
        assertFalse(PhoneMatcher.matches("", "653935666"));
    }

    @Test
    void rejectsDifferentNumbers() {
        assertFalse(PhoneMatcher.matches("+237653935666", PhoneMatcher.digitsOnly("653935667")));
    }
}
