package com.afriland.diaspora.adapter.out.notification;

import com.afriland.diaspora.application.port.out.EmailPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Repli sans envoi : loggue l'email sans le transmettre (parité « SIMULATED » du
 * monolithe FastAPI quand SMTP n'est pas configuré). Actif quand
 * {@code app.mail.enabled} est absent ou false ; sinon {@link SmtpEmailAdapter}
 * (canal réel) prend le relais. Garantit qu'un seul bean {@link EmailPort} existe.
 */
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class NoOpEmailAdapter implements EmailPort {

    private static final Logger log = LoggerFactory.getLogger(NoOpEmailAdapter.class);

    @Override
    public Map<String, Object> sendEmail(String toEmail, String subject, String body) {
        log.info("[EMAIL][NOOP] email simulé vers {} : {}", toEmail, subject);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("provider", "SMTP");
        result.put("to", toEmail);
        result.put("success", false);
        result.put("status", "EMAIL_NOOP");
        result.put("message", "Email non envoyé (SMTP désactivé — app.mail.enabled=false).");
        return result;
    }
}
