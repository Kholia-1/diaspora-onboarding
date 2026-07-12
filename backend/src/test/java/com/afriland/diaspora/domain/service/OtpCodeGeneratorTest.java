package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import java.util.random.RandomGenerator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OtpCodeGeneratorTest {

    @Test
    void padsToSixDigits() {
        RandomGenerator fixed = new FixedRandom(42);
        assertEquals("000042", OtpCodeGenerator.generate(fixed));

        RandomGenerator max = new FixedRandom(999999);
        assertEquals("999999", OtpCodeGenerator.generate(max));
    }

    @Test
    void alwaysSixDigits() {
        for (int i = 0; i < 200; i++) {
            String otp = OtpCodeGenerator.generate();
            assertEquals(6, otp.length(), "OTP doit faire 6 caractères");
            assertTrue(otp.matches("\\d{6}"), "OTP doit être composé de chiffres");
        }
    }

    /** Générateur déterministe : nextInt(bound) renvoie toujours la valeur fixée. */
    private static final class FixedRandom implements RandomGenerator {
        private final int value;

        FixedRandom(int value) {
            this.value = value;
        }

        @Override
        public int nextInt(int bound) {
            return value % bound;
        }

        @Override
        public long nextLong() {
            return value;
        }
    }
}
