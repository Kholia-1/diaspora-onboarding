package com.afriland.diaspora.domain.service;

/**
 * Normalisation d'un numéro WhatsApp — parité stricte avec _normalize_phone du legacy :
 * suppression des espaces/tirets/parenthèses, préfixe "+" garanti, reste réduit aux chiffres.
 */
public final class PhoneNormalizer {

    private PhoneNormalizer() {
    }

    public static String normalize(String value) {
        String v = value == null ? "" : value.strip();
        v = v.replace(" ", "").replace("-", "").replace("(", "").replace(")", "");

        if (!v.startsWith("+")) {
            return "+" + v.replaceAll("\\D", "");
        }
        return "+" + v.substring(1).replaceAll("\\D", "");
    }
}
