package com.afriland.diaspora.domain.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Normalisation d'un package — parité stricte avec normalize_package_item
 * (app/routers/backoffice.py). Java pur, opère sur des Map JSON.
 */
public final class PackageNormalizer {

    private PackageNormalizer() {
    }

    public static Map<String, Object> normalize(Map<String, Object> item, int index) {
        Map<String, Object> src = item == null ? Map.of() : item;

        String name = strip(str(src.get("name")));
        String code = strip(orDefault(str(src.get("code")),
                name.toUpperCase(Locale.ROOT).replace(" ", "_"))).toUpperCase(Locale.ROOT);
        String description = strip(str(src.get("description")));
        String currency = strip(orDefault(str(src.get("currency")), "XAF")).toUpperCase(Locale.ROOT);
        String customerType = strip(orDefault(str(src.get("customer_type")), "TOUS")).toUpperCase(Locale.ROOT);
        String mastercardItemCode = strip(orDefault(str(src.get("mastercard_item_code")), code))
                .toUpperCase(Locale.ROOT);
        String whatsappTemplate = strip(orDefault(str(src.get("whatsapp_template")),
                code.toLowerCase(Locale.ROOT) + "_selected"));

        List<String> services = parseServices(src.get("services"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("code", code);
        out.put("name", name.isEmpty() ? code : name);
        out.put("description", description);
        out.put("services", services);
        out.put("currency", currency);
        out.put("opening_fee", money(src.get("opening_fee")));
        out.put("subscription_fee", money(src.get("subscription_fee")));
        out.put("monthly_fee", money(src.get("monthly_fee")));
        out.put("payment_required", bool(src.get("payment_required"), false));
        out.put("active", bool(src.get("active"), true));
        out.put("display_order", intValue(src.get("display_order"), index + 1));
        out.put("customer_type", customerType);
        out.put("mastercard_item_code", mastercardItemCode);
        out.put("whatsapp_template", whatsappTemplate);
        return out;
    }

    /** Tri parité : (display_order or 100, name or ""). */
    public static void sort(List<Map<String, Object>> packages) {
        packages.sort(Comparator
                .comparingInt((Map<String, Object> p) -> intValue(p.get("display_order"), 100))
                .thenComparing(p -> str(p.get("name"))));
    }

    @SuppressWarnings("unchecked")
    private static List<String> parseServices(Object raw) {
        List<String> result = new ArrayList<>();
        if (raw instanceof String s) {
            for (String part : s.replace(",", "\n").split("\n")) {
                String v = part.strip();
                if (!v.isEmpty()) {
                    result.add(v);
                }
            }
            return result;
        }
        if (raw instanceof List<?> list) {
            for (Object o : list) {
                String v = str(o).strip();
                if (!v.isEmpty()) {
                    result.add(v);
                }
            }
        }
        return result;
    }

    /** Parité _money_value : null/"" → 0 (entier), sinon float, échec → 0. */
    static Object money(Object value) {
        if (value == null) {
            return 0;
        }
        String raw = str(value);
        if (raw.isEmpty()) {
            return 0;
        }
        try {
            return Double.parseDouble(raw.replace(" ", "").replace(",", "."));
        } catch (Exception e) {
            return 0;
        }
    }

    /** Parité _bool_value. */
    static boolean bool(Object value, boolean defaultValue) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value == null) {
            return defaultValue;
        }
        return switch (str(value).strip().toLowerCase(Locale.ROOT)) {
            case "1", "true", "yes", "oui", "on" -> true;
            default -> false;
        };
    }

    /** Parité _int_value. */
    static int intValue(Object value, int defaultValue) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(str(value).strip());
        } catch (Exception e) {
            return defaultValue;
        }
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
