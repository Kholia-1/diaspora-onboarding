package com.afriland.diaspora.adapter.out.payment;

import com.afriland.diaspora.config.AppProperties;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Configuration Mastercard résolue avec les valeurs par défaut du legacy
 * (load_mastercard_config). Applique les defaults quand les propriétés sont vides.
 */
record MastercardConfig(
        boolean enabled,
        String environment,
        String provider,
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

    static MastercardConfig resolve(AppProperties properties) {
        AppProperties.Mastercard mc = properties.mastercard();
        String publicBase = trimTrailingSlash(orDefault(properties.publicBaseUrl(),
                "https://diaspora-onboarding.com"));

        return new MastercardConfig(
                mc != null && mc.enabled(),
                orDefault(mc == null ? null : mc.environment(), "SANDBOX"),
                "MASTERCARD_GATEWAY",
                trimTrailingSlash(orDefault(mc == null ? null : mc.baseUrl(),
                        "https://test-gateway.mastercard.com")),
                orDefault(mc == null ? null : mc.merchantId(), ""),
                orDefault(mc == null ? null : mc.apiPassword(), ""),
                orDefault(mc == null ? null : mc.apiVersion(), "100"),
                orDefault(mc == null ? null : mc.currency(), "XAF"),
                orDefault(mc == null ? null : mc.operation(), "PURCHASE"),
                orDefault(mc == null ? null : mc.merchantName(), "Afriland First Bank"),
                orDefault(mc == null ? null : mc.merchantUrl(), "https://example.com"),
                orDefault(mc == null ? null : mc.returnUrl(), publicBase + "/api/payments/mastercard/return"),
                orDefault(mc == null ? null : mc.webhookUrl(), publicBase + "/api/payments/mastercard/webhook"));
    }

    /** Parité validate_mastercard_config : liste des éléments manquants. */
    List<String> validate() {
        List<String> missing = new ArrayList<>();
        if (!enabled) {
            missing.add("Intégration Mastercard désactivée.");
        }
        if (isBlank(baseUrl)) {
            missing.add("Base URL Mastercard Gateway manquante.");
        }
        if (isBlank(merchantId)) {
            missing.add("Merchant ID manquant.");
        }
        if (isBlank(apiPassword)) {
            missing.add("API Password Mastercard manquant.");
        }
        if (isBlank(apiVersion)) {
            missing.add("API version manquante.");
        }
        if (isBlank(currency)) {
            missing.add("Devise manquante.");
        }
        if (isBlank(operation)) {
            missing.add("Type d’opération Mastercard manquant.");
        }
        if (isBlank(returnUrl)) {
            missing.add("Return URL Mastercard manquante.");
        }
        if (isBlank(webhookUrl)) {
            missing.add("Webhook URL Mastercard manquante.");
        }
        return missing;
    }

    /** Parité public_config_status : secrets masqués, ready_for_real_call. */
    Map<String, Object> publicStatus() {
        List<String> missing = validate();
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", enabled);
        status.put("environment", environment);
        status.put("provider", provider);
        status.put("base_url", baseUrl);
        status.put("merchant_id_configured", !isBlank(merchantId));
        status.put("merchant_id", mask(merchantId));
        status.put("api_password_configured", !isBlank(apiPassword));
        status.put("api_password", mask(apiPassword));
        status.put("api_version", apiVersion);
        status.put("currency", currency);
        status.put("operation", operation);
        status.put("merchant_url", merchantUrl);
        status.put("return_url", returnUrl);
        status.put("webhook_url", webhookUrl);
        status.put("ready_for_real_call", missing.isEmpty());
        status.put("missing", missing);
        return status;
    }

    String sessionPath() {
        return "/api/rest/version/" + apiVersion + "/merchant/"
                + (isBlank(merchantId) ? "MERCHANT_ID" : merchantId) + "/session";
    }

    String orderPath(String orderId) {
        return "/api/rest/version/" + apiVersion + "/merchant/"
                + (isBlank(merchantId) ? "MERCHANT_ID" : merchantId) + "/order/" + orderId;
    }

    /** Parité mask_secret. */
    static String mask(String value) {
        String v = value == null ? "" : value;
        if (v.isEmpty()) {
            return "";
        }
        if (v.length() <= 6) {
            return "***";
        }
        return v.substring(0, 3) + "***" + v.substring(v.length() - 3);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String v = value;
        while (v.endsWith("/")) {
            v = v.substring(0, v.length() - 1);
        }
        return v;
    }
}
