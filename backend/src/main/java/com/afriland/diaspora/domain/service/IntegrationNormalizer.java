package com.afriland.diaspora.domain.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Normalisation et masquage des intégrations API — parité stricte avec
 * normalize_integration / mask_secret_value / public_integration_payload
 * (app/routers/backoffice.py). Java pur.
 */
public final class IntegrationNormalizer {

    /** Champs secrets masqués à la lecture et conservés à l'écriture s'ils reviennent masqués. */
    public static final Set<String> SECRET_FIELDS = Set.of(
            "api_key", "client_secret", "access_token", "password", "private_key");

    private IntegrationNormalizer() {
    }

    public static Map<String, Object> normalize(Map<String, Object> item) {
        Map<String, Object> src = item == null ? Map.of() : item;
        String code = strip(str(src.get("code"))).toUpperCase(Locale.ROOT);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("code", code);
        out.put("name", strip(orDefault(str(src.get("name")), code)));
        out.put("description", strip(str(src.get("description"))));
        out.put("enabled", boolValue(src.get("enabled")));
        out.put("environment", strip(orDefault(str(src.get("environment")), "SANDBOX")).toUpperCase(Locale.ROOT));
        out.put("provider", strip(str(src.get("provider"))));
        out.put("base_url", strip(str(src.get("base_url"))));
        out.put("auth_type", strip(orDefault(str(src.get("auth_type")), "API_KEY")).toUpperCase(Locale.ROOT));
        out.put("api_key", strip(str(src.get("api_key"))));
        out.put("client_id", strip(str(src.get("client_id"))));
        out.put("client_secret", strip(str(src.get("client_secret"))));
        out.put("phone_number_id", strip(str(src.get("phone_number_id"))));
        out.put("channel_uuid", strip(str(src.get("channel_uuid"))));
        out.put("template_uuid", strip(str(src.get("template_uuid"))));
        out.put("endpoint_path", strip(str(src.get("endpoint_path"))));
        out.put("business_account_id", strip(str(src.get("business_account_id"))));
        out.put("merchant_id", strip(str(src.get("merchant_id"))));
        out.put("api_version", strip(str(src.get("api_version"))));
        out.put("currency", strip(str(src.get("currency"))));
        out.put("operation", strip(str(src.get("operation"))));
        out.put("webhook_url", strip(str(src.get("webhook_url"))));
        out.put("callback_url", strip(str(src.get("callback_url"))));
        out.put("notes", strip(str(src.get("notes"))));
        return out;
    }

    /** Parité mask_secret_value : "" si vide ; "******" si ≤6 ; sinon 3 premiers + "******" + 3 derniers. */
    public static String maskSecretValue(Object value) {
        if (value == null) {
            return "";
        }
        String v = String.valueOf(value);
        if (v.isEmpty()) {
            return "";
        }
        if (v.length() <= 6) {
            return "******";
        }
        return v.substring(0, 3) + "******" + v.substring(v.length() - 3);
    }

    /** Copie masquée d'une intégration — parité public_integration_payload (masque les champs présents). */
    public static Map<String, Object> publicPayload(Map<String, Object> item) {
        Map<String, Object> masked = new LinkedHashMap<>(item);
        for (String field : SECRET_FIELDS) {
            if (masked.containsKey(field)) {
                masked.put(field, maskSecretValue(masked.get(field)));
            }
        }
        return masked;
    }

    /** Vrai si la valeur d'un secret est vide ou masquée (contient "******"). */
    public static boolean isBlankOrMasked(Object value) {
        String v = value == null ? "" : String.valueOf(value).strip();
        return v.isEmpty() || v.contains("******");
    }

    public static List<Map<String, Object>> maskAll(List<Map<String, Object>> integrations) {
        return integrations.stream().map(IntegrationNormalizer::publicPayload).toList();
    }

    private static boolean boolValue(Object value) {
        return value instanceof Boolean b && b;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String strip(String value) {
        return value == null ? "" : value.strip();
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }
}
