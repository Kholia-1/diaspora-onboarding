package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.ManageBackofficeConfigUseCase;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.ConfigStorePort;
import com.afriland.diaspora.application.port.out.IntegrationConnectivityPort;
import com.afriland.diaspora.domain.service.IntegrationNormalizer;
import com.afriland.diaspora.domain.service.PackageNormalizer;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class BackofficeConfigService implements ManageBackofficeConfigUseCase {

    private static final String PACKAGES_FILE = "packages.json";
    private static final String INTEGRATIONS_FILE = "api_integrations.json";

    private final ConfigStorePort configStore;
    private final IntegrationConnectivityPort connectivity;
    private final AuditPort audit;

    public BackofficeConfigService(ConfigStorePort configStore, IntegrationConnectivityPort connectivity,
                                   AuditPort audit) {
        this.configStore = configStore;
        this.connectivity = connectivity;
        this.audit = audit;
    }

    // --- Packages ---

    @Override
    public Map<String, Object> getPackages() {
        List<Map<String, Object>> normalized = normalizePackages(rawPackages());
        PackageNormalizer.sort(normalized);
        return Map.of("packages", normalized);
    }

    @Override
    public Map<String, Object> savePackages(Map<String, Object> payload, String actor, String ip, String ua) {
        Object packages = payload == null ? null : payload.get("packages");
        if (!(packages instanceof List<?> list)) {
            throw ApiException.badRequest("Le champ packages doit être une liste.");
        }

        List<Map<String, Object>> cleaned = new ArrayList<>();
        int index = 0;
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Map<String, Object> normalized = PackageNormalizer.normalize(castMap(map), index);
                if (!str(normalized.get("code")).isEmpty() && !str(normalized.get("name")).isEmpty()) {
                    cleaned.add(normalized);
                }
            }
            index++;
        }
        PackageNormalizer.sort(cleaned);

        Map<String, Object> toStore = new LinkedHashMap<>();
        toStore.put("packages", cleaned);
        configStore.write(PACKAGES_FILE, toStore);

        audit.log(actor, "PACKAGES_CONFIG_UPDATED", "PackagesConfig", null,
                "{\"packages_count\": " + cleaned.size() + "}", ip, ua);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Configuration des packages enregistrée");
        response.put("packages", cleaned);
        return response;
    }

    // --- Intégrations API ---

    @Override
    public Map<String, Object> getApiIntegrations() {
        List<Map<String, Object>> normalized = loadNormalizedIntegrations();
        return Map.of("integrations", IntegrationNormalizer.maskAll(normalized));
    }

    @Override
    public Map<String, Object> saveApiIntegrations(Map<String, Object> payload, String actor, String ip, String ua) {
        Object incoming = payload == null ? null : payload.get("integrations");
        if (!(incoming instanceof List<?> list)) {
            throw ApiException.badRequest("Le champ integrations doit être une liste.");
        }

        Map<String, Map<String, Object>> currentByCode = new LinkedHashMap<>();
        for (Map<String, Object> item : loadNormalizedIntegrations()) {
            currentByCode.put(str(item.get("code")), item);
        }

        List<Map<String, Object>> cleaned = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Map<String, Object> normalized = IntegrationNormalizer.normalize(castMap(map));
            String code = str(normalized.get("code"));
            if (code.isEmpty()) {
                continue;
            }

            Map<String, Object> old = currentByCode.getOrDefault(code, Map.of());
            // Secret vide ou masqué → on conserve l'ancienne valeur (parité legacy).
            for (String field : IntegrationNormalizer.SECRET_FIELDS) {
                if (IntegrationNormalizer.isBlankOrMasked(normalized.get(field))) {
                    normalized.put(field, old.getOrDefault(field, ""));
                }
            }
            cleaned.add(normalized);
        }

        Map<String, Object> toStore = new LinkedHashMap<>();
        toStore.put("integrations", cleaned);
        configStore.write(INTEGRATIONS_FILE, toStore);

        List<String> codes = cleaned.stream().map(item -> str(item.get("code"))).toList();
        audit.log(actor, "API_INTEGRATIONS_UPDATED", "ApiIntegrationsConfig", null,
                "{\"integrations\": [" + String.join(", ", codes.stream().map(BackofficeConfigService::json).toList())
                        + "]}", ip, ua);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Configuration des intégrations API enregistrée.");
        response.put("integrations", IntegrationNormalizer.maskAll(cleaned));
        return response;
    }

    @Override
    public Map<String, Object> testIntegration(String integrationCode) {
        String code = (integrationCode == null ? "" : integrationCode).strip().toUpperCase(Locale.ROOT);

        Map<String, Object> integration = loadNormalizedIntegrations().stream()
                .filter(item -> code.equals(str(item.get("code"))))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Intégration API introuvable."));

        List<String> required = requiredFields(code);
        List<String> missing = new ArrayList<>();
        for (String field : required) {
            if (str(integration.get(field)).strip().isEmpty()) {
                missing.add(field);
            }
        }

        if (!Boolean.TRUE.equals(integration.get("enabled"))) {
            return statusResponse(code, integration, "DISABLED", false,
                    "Cette intégration est désactivée. Activez-la avant de tester la connexion.", missing, null);
        }

        if (!missing.isEmpty()) {
            return statusResponse(code, integration, "CONFIG_INCOMPLETE", false,
                    "Configuration incomplète. Certains champs obligatoires sont manquants.", missing, null);
        }

        Map<String, Object> conn = connectivity.test(str(integration.get("base_url")));
        boolean success = Boolean.TRUE.equals(conn.get("success"));
        return statusResponse(code, integration,
                success ? "CONNECTION_OK" : "CONNECTION_FAILED", success,
                str(conn.get("message")), List.of(), conn);
    }

    // --- Helpers ---

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rawPackages() {
        Map<String, Object> data = configStore.readOrCreate(PACKAGES_FILE, defaultPackagesConfig());
        Object packages = data.get("packages");
        if (packages instanceof List<?> list && !list.isEmpty()) {
            return (List<Map<String, Object>>) (List<?>) list;
        }
        return defaultPackages();
    }

    private List<Map<String, Object>> normalizePackages(List<Map<String, Object>> packages) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        int index = 0;
        for (Map<String, Object> item : packages) {
            normalized.add(PackageNormalizer.normalize(item, index));
            index++;
        }
        return normalized;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadNormalizedIntegrations() {
        Map<String, Object> data = configStore.readOrCreate(INTEGRATIONS_FILE, defaultIntegrationsConfig());
        Object integrations = data.get("integrations");
        List<Map<String, Object>> source = integrations instanceof List<?> list && !list.isEmpty()
                ? (List<Map<String, Object>>) (List<?>) list
                : defaultIntegrations();

        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> item : source) {
            normalized.add(IntegrationNormalizer.normalize(item));
        }
        return normalized;
    }

    /** Parité integration_required_fields (app/routers/api_integration_tests.py). */
    private static List<String> requiredFields(String code) {
        return switch (code) {
            case "WHATSAPP" -> List.of("base_url", "api_key", "phone_number_id");
            case "MASTERCARD" -> List.of("base_url", "merchant_id");
            case "CORE_BANKING", "BLACKMODULE", "GED" -> List.of("base_url", "auth_type");
            default -> List.of("base_url");
        };
    }

    private static Map<String, Object> statusResponse(String code, Map<String, Object> integration, String status,
                                                      boolean success, String message, List<String> missing,
                                                      Map<String, Object> connectivity) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("code", code);
        response.put("name", integration.get("name"));
        response.put("status", status);
        response.put("success", success);
        response.put("message", message);
        response.put("missing_fields", missing);
        response.put("environment", integration.get("environment"));
        response.put("provider", integration.get("provider"));
        if (connectivity != null) {
            response.put("connectivity", connectivity);
        }
        return response;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Map<?, ?> map) {
        return (Map<String, Object>) map;
    }

    private static String json(String value) {
        return value == null ? "null" : "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    // --- Valeurs par défaut (fallback si le fichier data/ est absent) ---
    // Parité DEFAULT_PACKAGES / DEFAULT_API_INTEGRATIONS. Divergence sécurité : les secrets
    // des intégrations par défaut sont laissés VIDES (le legacy versionnait une clé de test
    // Mastercard en dur — non dupliquée ici).

    private Map<String, Object> defaultPackagesConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("packages", defaultPackages());
        return config;
    }

    private List<Map<String, Object>> defaultPackages() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(defaultPackage("BUDGET", "Package Budget",
                "Destiné aux clients recherchant l’essentiel bancaire à coût maîtrisé.",
                List.of("SMS First", "Carte Fellow", "SARA Banking"), 1, "PARTICULIER", "PKG_BUDGET",
                "package_budget_selected"));
        list.add(defaultPackage("BUSINESS", "Package Business",
                "Pour les professionnels et clients ayant des besoins bancaires étendus.",
                List.of("SMS First", "Assurance", "Découvert permanent", "Carte Visa Classique"), 2,
                "PROFESSIONNEL", "PKG_BUSINESS", "package_business_selected"));
        list.add(defaultPackage("ECO", "Package Eco",
                "L’essentiel au meilleur prix pour une ouverture de compte simplifiée.",
                List.of("SMS First", "Assurance", "SARA Banking"), 3, "PARTICULIER", "PKG_ECO",
                "package_eco_selected"));
        return list;
    }

    private Map<String, Object> defaultPackage(String code, String name, String description, List<String> services,
                                               int order, String customerType, String mastercardItemCode,
                                               String whatsappTemplate) {
        Map<String, Object> pkg = new LinkedHashMap<>();
        pkg.put("code", code);
        pkg.put("name", name);
        pkg.put("description", description);
        pkg.put("services", services);
        pkg.put("currency", "XAF");
        pkg.put("opening_fee", 0);
        pkg.put("subscription_fee", 0);
        pkg.put("monthly_fee", 0);
        pkg.put("payment_required", false);
        pkg.put("active", true);
        pkg.put("display_order", order);
        pkg.put("customer_type", customerType);
        pkg.put("mastercard_item_code", mastercardItemCode);
        pkg.put("whatsapp_template", whatsappTemplate);
        return pkg;
    }

    private Map<String, Object> defaultIntegrationsConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("integrations", defaultIntegrations());
        return config;
    }

    private List<Map<String, Object>> defaultIntegrations() {
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(defaultIntegration("WHATSAPP", "WhatsApp Business API",
                "Notifications client : lien de paiement, paiement confirmé, dossier approuvé, compte ouvert.",
                false, "SANDBOX", "CALLBELL", "https://api.callbell.eu"));
        list.add(defaultIntegration("MASTERCARD", "Mastercard Payment Gateway",
                "Paiement des frais de souscription package après validation back-office.",
                true, "PRODUCTION", "MASTERCARD_GATEWAY", "https://test-gateway.mastercard.com"));
        list.add(defaultIntegration("BLACKMODULE", "BLACKMODULE conformité",
                "Screening sanctions, PPE, listes internes et résultat conformité.",
                false, "INTERNAL", "BLACKMODULE", ""));
        return list;
    }

    private Map<String, Object> defaultIntegration(String code, String name, String description, boolean enabled,
                                                   String environment, String provider, String baseUrl) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("code", code);
        item.put("name", name);
        item.put("description", description);
        item.put("enabled", enabled);
        item.put("environment", environment);
        item.put("provider", provider);
        item.put("base_url", baseUrl);
        item.put("auth_type", "API_KEY");
        return item;
    }
}
