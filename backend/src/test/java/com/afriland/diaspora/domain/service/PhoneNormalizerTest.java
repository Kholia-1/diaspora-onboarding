package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PhoneNormalizerTest {

    @Test
    void addsLeadingPlusAndStripsFormatting() {
        assertEquals("+237653935666", PhoneNormalizer.normalize("237 653-93-56-66"));
        assertEquals("+237653935666", PhoneNormalizer.normalize("(237) 653 935 666"));
    }

    @Test
    void keepsSinglePlusAndStripsRest() {
        assertEquals("+237653935666", PhoneNormalizer.normalize("+237 653 935 666"));
        // Un "+" interne au reste est supprimé (seul le préfixe est conservé).
        assertEquals("+237653935666", PhoneNormalizer.normalize("+237-653-93-56-66"));
    }

    @Test
    void handlesNullAndEmpty() {
        assertEquals("+", PhoneNormalizer.normalize(null));
        assertEquals("+", PhoneNormalizer.normalize("   "));
    }
}
