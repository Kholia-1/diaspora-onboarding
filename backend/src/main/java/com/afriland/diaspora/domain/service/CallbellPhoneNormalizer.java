package com.afriland.diaspora.domain.service;

/**
 * Normalisation de numéro pour Callbell — parité stricte avec normalize_phone
 * (app/services/whatsapp_notification_service.py) : gère "+", "00", "237" et les
 * numéros locaux à 9 chiffres commençant par 6 (préfixe indicatif pays par défaut).
 */
public final class CallbellPhoneNormalizer {

    public static final String DEFAULT_COUNTRY_CODE = "+237";

    private CallbellPhoneNormalizer() {
    }

    public static String normalize(String phone, String defaultCountryCode) {
        String cc = defaultCountryCode == null || defaultCountryCode.isBlank()
                ? DEFAULT_COUNTRY_CODE
                : defaultCountryCode;

        String value = phone == null ? "" : phone.strip();
        value = value.replace(" ", "").replace("-", "").replace("(", "").replace(")", "");

        if (value.isEmpty()) {
            return "";
        }
        if (value.startsWith("+")) {
            return value;
        }
        if (value.startsWith("00")) {
            return "+" + value.substring(2);
        }
        if (value.startsWith("237")) {
            return "+" + value;
        }
        if (value.startsWith("6") && value.length() == 9) {
            return cc + value;
        }
        return value;
    }
}
