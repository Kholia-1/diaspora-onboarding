package com.afriland.diaspora.domain.service;

/**
 * Rapprochement de numéros de téléphone par suffixe de chiffres — parité avec
 * phone_matches de GET /api/applications/status-by-contact : comparaison sur les
 * 8 à 9 derniers chiffres pour ignorer l'indicatif pays et les différences de
 * format (+237 6XX..., 006237..., 6XX...).
 */
public final class PhoneMatcher {

    private PhoneMatcher() {
    }

    /** Supprime tout sauf les chiffres (parité re.sub(r"\D", "", value)). */
    public static String digitsOnly(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\D", "");
    }

    /**
     * Vrai si le numéro stocké correspond au numéro recherché sur leurs derniers chiffres.
     *
     * @param storedPhone  numéro en base (format libre)
     * @param queryDigits  numéro recherché DÉJÀ réduit à ses chiffres
     */
    public static boolean matches(String storedPhone, String queryDigits) {
        String storedDigits = digitsOnly(storedPhone);
        String query = queryDigits == null ? "" : queryDigits;

        int tail = Math.min(Math.min(storedDigits.length(), query.length()), 9);
        if (tail < 8) {
            return false;
        }

        return storedDigits.substring(storedDigits.length() - tail)
                .equals(query.substring(query.length() - tail));
    }
}
