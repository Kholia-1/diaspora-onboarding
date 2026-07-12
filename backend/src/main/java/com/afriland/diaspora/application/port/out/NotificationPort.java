package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Notifications client (WhatsApp). Best-effort : les implémentations ne doivent
 * jamais lever d'exception bloquante pour l'action métier.
 * Phase 2 : implémentation NoOp loggée — la consolidation Callbell arrive en Phase 4.
 */
public interface NotificationPort {

    /** Envoi d'un message texte libre (parité send_whatsapp_message). Retourne le résultat brut. */
    Map<String, Object> sendMessage(String phone, String message);

    /** Envoi d'une notification d'événement (parité send_whatsapp_notification). */
    Map<String, Object> sendEvent(String phone, String eventType, Map<String, Object> context);
}
