package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PackageNormalizerTest {

    @Test
    void codeDerivedFromNameWhenAbsentAndDefaultsApplied() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("name", "Package Business");

        Map<String, Object> out = PackageNormalizer.normalize(item, 4);

        assertEquals("PACKAGE_BUSINESS", out.get("code"));
        assertEquals("Package Business", out.get("name"));
        assertEquals("XAF", out.get("currency"));
        assertEquals("TOUS", out.get("customer_type"));
        assertEquals("PACKAGE_BUSINESS", out.get("mastercard_item_code"));
        assertEquals("package_business_selected", out.get("whatsapp_template"));
        assertEquals(false, out.get("payment_required"));
        assertEquals(true, out.get("active"));
        assertEquals(5, out.get("display_order")); // index + 1
    }

    @Test
    void servicesParsedFromCommaSeparatedString() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("code", "eco");
        item.put("services", "SMS First, Assurance ,  SARA Banking ");

        Map<String, Object> out = PackageNormalizer.normalize(item, 0);

        assertEquals(List.of("SMS First", "Assurance", "SARA Banking"), out.get("services"));
        assertEquals("ECO", out.get("code"));
    }

    @Test
    void moneyValuesParsedWithSpacesAndComma() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("code", "X");
        item.put("opening_fee", "5 000,50");
        item.put("subscription_fee", "");
        item.put("monthly_fee", 1500);

        Map<String, Object> out = PackageNormalizer.normalize(item, 0);

        assertEquals(5000.5, out.get("opening_fee"));
        assertEquals(0, out.get("subscription_fee")); // vide → 0 (entier)
        assertEquals(1500.0, out.get("monthly_fee"));
    }

    @Test
    void sortByDisplayOrderThenName() {
        List<Map<String, Object>> packages = new ArrayList<>();
        packages.add(pkg("B", 2));
        packages.add(pkg("A", 2));
        packages.add(pkg("C", 1));

        PackageNormalizer.sort(packages);

        assertEquals("C", packages.get(0).get("name"));
        assertEquals("A", packages.get(1).get("name"));
        assertEquals("B", packages.get(2).get("name"));
    }

    private static Map<String, Object> pkg(String name, int order) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("name", name);
        p.put("display_order", order);
        return p;
    }
}
