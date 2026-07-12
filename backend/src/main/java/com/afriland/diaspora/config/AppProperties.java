package com.afriland.diaspora.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Propriétés applicatives.
 * app.storage.base-dir : racine du dépôt (les file_path en base y sont relatifs).
 * app.fernet.key-file  : fichier .fernet_key (utilisé si la variable d'env FERNET_KEY est absente).
 * app.blackmodule.screening-url : URL du service BLACKMODULE (la variable d'env
 * BLACKMODULE_SCREENING_URL reste prioritaire, parité avec le monolithe Python).
 * app.ocr.* : microservice OCR interne.
 * app.pre-onboarding.* : upload et politique OTP du pré-onboarding.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Storage storage,
        Fernet fernet,
        Blackmodule blackmodule,
        Ocr ocr,
        PreOnboarding preOnboarding) {

    public record Storage(String baseDir) {
    }

    public record Fernet(String keyFile) {
    }

    public record Blackmodule(String screeningUrl) {
    }

    public record Ocr(String baseUrl, String apiKey, int timeoutSeconds) {
    }

    public record PreOnboarding(String uploadDir, Otp otp) {

        public record Otp(int ttlMinutes, int maxAttempts, boolean demoMode, String secret,
                          boolean fallbackDisplay) {
        }
    }
}
