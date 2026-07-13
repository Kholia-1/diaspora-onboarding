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
 * app.callbell.* : notifications WhatsApp via Callbell (Phase 4).
 * app.mastercard.* : passerelle de paiement Mastercard Hosted Checkout (Phase 4).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Storage storage,
        Fernet fernet,
        Blackmodule blackmodule,
        Ocr ocr,
        PreOnboarding preOnboarding,
        Callbell callbell,
        Mastercard mastercard,
        String publicBaseUrl) {

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

    public record Callbell(
            boolean enabled,
            String baseUrl,
            String apiToken,
            String channelUuid,
            String templateUuid,
            boolean useTemplate,
            String defaultCountryCode) {
    }

    public record Mastercard(
            boolean enabled,
            String environment,
            String baseUrl,
            String merchantId,
            String apiPassword,
            String apiVersion,
            String currency,
            String operation,
            String merchantName,
            String merchantUrl,
            String returnUrl,
            String webhookUrl) {
    }
}
