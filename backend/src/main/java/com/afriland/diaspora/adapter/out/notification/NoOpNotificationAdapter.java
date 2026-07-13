package com.afriland.diaspora.adapter.out.notification;

import com.afriland.diaspora.application.port.out.NotificationPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Repli sans envoi : loggue la notification sans la transmettre. Actif quand Callbell
 * n'est pas activé ({@code app.callbell.enabled} absent ou false) ; sinon
 * {@link CallbellNotificationAdapter} (canal réel) prend le relais. Garantit qu'un
 * seul bean {@link NotificationPort} est présent.
 */
@Component
@ConditionalOnProperty(name = "app.callbell.enabled", havingValue = "false", matchIfMissing = true)
public class NoOpNotificationAdapter implements NotificationPort {

    private static final Logger log = LoggerFactory.getLogger(NoOpNotificationAdapter.class);

    @Override
    public Map<String, Object> sendMessage(String phone, String message) {
        log.info("[WHATSAPP][NOOP] message vers {} : {}", phone, message);
        return result("Message non envoyé (adapter NoOp — consolidation Callbell en Phase 4).");
    }

    @Override
    public Map<String, Object> sendEvent(String phone, String eventType, Map<String, Object> context) {
        log.info("[WHATSAPP][NOOP] événement {} vers {} : {}", eventType, phone, context);
        return result("Notification '" + eventType
                + "' non envoyée (adapter NoOp — Callbell non configuré).");
    }

    @Override
    public Map<String, Object> getDeliveryStatus(String messageUuid) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("success", false);
        payload.put("status", "CONFIG_MISSING");
        payload.put("message", "Callbell non configuré — statut de livraison indisponible.");
        return payload;
    }

    private static Map<String, Object> result(String message) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("success", false);
        payload.put("status", "NOTIFICATION_NOOP");
        payload.put("message", message);
        return payload;
    }
}
