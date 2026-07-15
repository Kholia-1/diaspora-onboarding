package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Envoi d'emails client (parité send_email_notification du monolithe FastAPI).
 * Best-effort : les implémentations ne doivent JAMAIS lever d'exception bloquante
 * pour l'action métier — elles retournent un résultat descriptif.
 */
public interface EmailPort {

    /** Envoie un email texte. Retourne un résultat {success, status, ...} jamais null. */
    Map<String, Object> sendEmail(String toEmail, String subject, String body);
}
