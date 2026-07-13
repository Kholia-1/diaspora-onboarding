package com.afriland.diaspora.adapter.out.notification;

import com.afriland.diaspora.application.port.out.NotificationPort;
import com.afriland.diaspora.config.AppProperties;
import com.afriland.diaspora.domain.service.CallbellPhoneNormalizer;
import com.afriland.diaspora.domain.service.WhatsAppMessageBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Canal WhatsApp réel via Callbell — consolide les 3 clients Python legacy
 * (whatsapp_notification_service, whatsapp_service, callbell_delivery_status_service)
 * derrière l'unique {@link NotificationPort}.
 *
 * <p>Actif uniquement quand {@code app.callbell.enabled=true} ; sinon
 * {@link NoOpNotificationAdapter} prend le relais (aucun message envoyé).
 * Best-effort : ne lève jamais d'exception (l'action métier n'est pas bloquée par
 * un échec de notification).
 *
 * <p>Parité : POST {base}/v1/messages/send et GET {base}/v1/messages/status/{uuid},
 * payload texte libre (use-template=false par défaut — blocage Meta 131042 sur templates).
 */
@Component
@ConditionalOnProperty(name = "app.callbell.enabled", havingValue = "true")
public class CallbellNotificationAdapter implements NotificationPort {

    private static final Logger log = LoggerFactory.getLogger(CallbellNotificationAdapter.class);

    private final AppProperties.Callbell config;
    private final RestClient restClient;

    public CallbellNotificationAdapter(AppProperties properties) {
        this.config = properties.callbell();
        String baseUrl = config.baseUrl() != null && !config.baseUrl().isBlank()
                ? config.baseUrl().replaceAll("/+$", "")
                : "https://api.callbell.eu";

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(30));
        factory.setReadTimeout(Duration.ofSeconds(30));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("Authorization", "Bearer " + safe(config.apiToken()))
                .defaultHeader("Accept", "application/json")
                .defaultHeader("User-Agent",
                        "DiasporaOnboarding/1.0 (+https://onboarding.afb-firstagent.com)")
                .build();
    }

    @Override
    public Map<String, Object> sendMessage(String phone, String message) {
        return sendText(phone, message, Map.of());
    }

    @Override
    public Map<String, Object> sendEvent(String phone, String eventType, Map<String, Object> context) {
        Map<String, Object> ctx = context == null ? Map.of() : context;
        String message = WhatsAppMessageBuilder.build(eventType, ctx);
        Map<String, Object> enriched = new LinkedHashMap<>(ctx);
        enriched.put("event_type", eventType);
        return sendText(phone, message, enriched);
    }

    private Map<String, Object> sendText(String phone, String message, Map<String, Object> context) {
        String to = CallbellPhoneNormalizer.normalize(phone, config.defaultCountryCode());

        Map<String, Object> base = new LinkedHashMap<>();
        base.put("provider", "CALLBELL");
        base.put("channel", "WHATSAPP");
        base.put("to", to);
        base.put("prepared_message", message);

        // Validations de configuration (parité : CONFIG_INCOMPLETE, jamais d'exception).
        if (to.isBlank()) {
            return incomplete(base, "Numéro WhatsApp destinataire manquant.");
        }
        if (safe(config.apiToken()).isBlank()) {
            return incomplete(base, "CALLBELL_API_TOKEN manquant.");
        }
        if (safe(config.channelUuid()).isBlank()) {
            return incomplete(base, "CALLBELL_CHANNEL_UUID manquant.");
        }
        if (config.useTemplate() && safe(config.templateUuid()).isBlank()) {
            return incomplete(base, "CALLBELL_TEMPLATE_UUID manquant alors que use-template=true.");
        }

        try {
            Map<String, Object> payload = buildPayload(to, message, context);
            Map<?, ?> response = restClient.post()
                    .uri("/v1/messages/send")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            base.put("status", "SENT");
            base.put("success", true);
            base.put("sent", true);
            base.put("response", response);
            base.put("callbell_message_uuid", extractUuid(response));
            log.info("[WHATSAPP][CALLBELL] message envoyé à {}", to);
            return base;

        } catch (Exception e) {
            // Fail-safe : on loggue et on renvoie un statut d'erreur non bloquant.
            log.warn("[WHATSAPP][CALLBELL] échec envoi à {} : {}", to, e.getMessage());
            base.put("status", "ERROR");
            base.put("success", false);
            base.put("sent", false);
            base.put("error", e.getMessage());
            return base;
        }
    }

    private Map<String, Object> buildPayload(String to, String message, Map<String, Object> context) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("to", to);
        payload.put("from", "whatsapp");
        payload.put("type", "text");
        payload.put("channel_uuid", config.channelUuid());
        payload.put("content", Map.of("text", message));
        payload.put("metadata", Map.of(
                "source", "diaspora_onboarding",
                "event_type", truncate(str(context.get("event_type")), 50),
                "reference", truncate(firstNonEmpty(
                        context.get("reference"), context.get("application_reference")), 500)));

        if (config.useTemplate() && !safe(config.templateUuid()).isBlank()) {
            payload.put("template_uuid", config.templateUuid());
            payload.put("optin_contact", true);
            Object templateValues = context.get("template_values");
            if (templateValues instanceof List<?> list && !list.isEmpty()) {
                payload.put("template_values", list.stream().map(String::valueOf).toList());
            } else {
                payload.put("template_values", List.of(message));
            }
        }
        return payload;
    }

    @Override
    public Map<String, Object> getDeliveryStatus(String messageUuid) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("uuid", messageUuid);

        if (messageUuid == null || messageUuid.isBlank()) {
            result.put("success", false);
            result.put("status", "NO_UUID");
            return result;
        }
        try {
            Map<?, ?> response = restClient.get()
                    .uri("/v1/messages/status/{uuid}", messageUuid)
                    .retrieve()
                    .body(Map.class);
            result.put("success", true);
            result.put("status", "OK");
            result.put("response", response);
            return result;
        } catch (Exception e) {
            log.warn("[WHATSAPP][CALLBELL] statut livraison indisponible ({}) : {}",
                    messageUuid, e.getMessage());
            result.put("success", false);
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
            return result;
        }
    }

    private static Map<String, Object> incomplete(Map<String, Object> base, String reason) {
        base.put("status", "CONFIG_INCOMPLETE");
        base.put("success", false);
        base.put("sent", false);
        base.put("message", reason);
        return base;
    }

    @SuppressWarnings("unchecked")
    private static String extractUuid(Object response) {
        if (response instanceof Map<?, ?> map) {
            Object message = map.get("message");
            if (message instanceof Map<?, ?> m && m.get("uuid") != null) {
                return String.valueOf(m.get("uuid"));
            }
            if (map.get("uuid") != null) {
                return String.valueOf(map.get("uuid"));
            }
        }
        return null;
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String firstNonEmpty(Object a, Object b) {
        String sa = str(a);
        return !sa.isBlank() ? sa : str(b);
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
