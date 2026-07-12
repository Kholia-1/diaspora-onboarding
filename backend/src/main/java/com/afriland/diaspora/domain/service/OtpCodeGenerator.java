package com.afriland.diaspora.domain.service;

import java.security.SecureRandom;
import java.util.random.RandomGenerator;

/** Génère un OTP à 6 chiffres avec zéros de tête — parité f"{random.randint(0, 999999):06d}". */
public final class OtpCodeGenerator {

    private static final RandomGenerator SECURE_RANDOM = new SecureRandom();

    private OtpCodeGenerator() {
    }

    public static String generate() {
        return generate(SECURE_RANDOM);
    }

    /** Variante testable : le générateur produit un entier dans [0, 1_000_000[. */
    public static String generate(RandomGenerator random) {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}
