package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Notifications client (WhatsApp/Callbell). Best-effort : les implémentations ne
 * doivent JAMAIS lever d'exception bloquante pour l'action métier.
 * Phase 4 : implémentation CallbellNotificationAdapter (canal réel) avec repli NoOp
 * si Callbell n'est pas configuré.
 */
public interface NotificationPort {

    /** Envoi d'un message texte libre (parité send_whatsapp_message). Retourne le résultat brut. */
    Map<String, Object> sendMessage(String phone, String message);

    /** Envoi d'une notification d'événement métier (parité send_whatsapp_notification). */
    Map<String, Object> sendEvent(String phone, String eventType, Map<String, Object> context);

    /** Statut de livraison d'un message Callbell (parité get_callbell_message_status). */
    Map<String, Object> getDeliveryStatus(String messageUuid);
}
