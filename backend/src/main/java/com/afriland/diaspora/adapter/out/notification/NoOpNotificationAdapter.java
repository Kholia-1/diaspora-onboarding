package com.afriland.diaspora.adapter.out.notification;

import com.afriland.diaspora.application.port.out.NotificationPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Implémentation temporaire (Phase 2) : loggue la notification sans l'envoyer.
 * La consolidation Callbell/WhatsApp est prévue en Phase 4 — cet adapter sera
 * remplacé par un CallbellNotificationAdapter implémentant le même port.
 */
@Component
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
                + "' non envoyée (adapter NoOp — consolidation Callbell en Phase 4).");
    }

    private static Map<String, Object> result(String message) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("success", false);
        payload.put("status", "NOTIFICATION_NOOP");
        payload.put("message", message);
        return payload;
    }
}
