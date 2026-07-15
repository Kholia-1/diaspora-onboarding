package com.afriland.diaspora.adapter.out.notification;

import com.afriland.diaspora.application.port.out.EmailPort;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Canal email réel (spring.mail). Actif quand {@code app.mail.enabled=true} ; sinon
 * {@link NoOpEmailAdapter} prend le relais. Best-effort : toute erreur SMTP est
 * loguée et retournée, jamais propagée.
 *
 * <p>EMAIL_BRANDED_HTML_V1 : l'email part en multipart (texte brut + HTML) avec le
 * logo Afriland intégré en image inline (CID) — même gabarit que le monolithe FastAPI.
 */
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class SmtpEmailAdapter implements EmailPort {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailAdapter.class);
    private static final String LOGO_RESOURCE = "afriland-logo.png";
    private static final String LOGO_CID = "afrilandLogo";

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpEmailAdapter(JavaMailSender mailSender, @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public Map<String, Object> sendEmail(String toEmail, String subject, String body) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("provider", "SMTP");
        result.put("channel", "EMAIL");
        result.put("to", toEmail);

        if (toEmail == null || toEmail.isBlank()) {
            result.put("success", false);
            result.put("status", "SKIPPED");
            result.put("message", "Aucune adresse email client.");
            return result;
        }

        try {
            ClassPathResource logo = new ClassPathResource(LOGO_RESOURCE);
            boolean withLogo = logo.exists();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(toEmail.strip());
            helper.setSubject(subject);
            // Texte brut en repli + version HTML avec logo inline.
            helper.setText(body, buildBrandedHtml(body, withLogo));
            if (withLogo) {
                helper.addInline(LOGO_CID, logo, "image/png");
            }
            mailSender.send(message);

            result.put("success", true);
            result.put("status", "SENT");
            log.info("[EMAIL][SMTP] envoyé à {} : {}", toEmail, subject);
        } catch (Exception exc) {
            result.put("success", false);
            result.put("status", "EMAIL_ERROR");
            result.put("error", String.valueOf(exc.getMessage()));
            log.warn("[EMAIL][SMTP] échec vers {} : {}", toEmail, exc.getMessage());
        }

        return result;
    }

    private static String buildBrandedHtml(String body, boolean withLogo) {
        StringBuilder paragraphs = new StringBuilder();
        for (String line : (body == null ? "" : body).split("\n")) {
            if (!line.isBlank()) {
                paragraphs.append("<p style=\"margin:0 0 14px;color:#1f2937;font-size:15px;line-height:1.65;\">")
                        .append(escapeHtml(line))
                        .append("</p>");
            }
        }

        String logoHtml = withLogo
                ? "<img src=\"cid:" + LOGO_CID + "\" alt=\"Afriland First Bank\" "
                        + "style=\"max-width:200px;height:auto;display:block;\">"
                : "";

        return "<!DOCTYPE html>"
                + "<html lang=\"fr\"><body style=\"margin:0;padding:0;background:#f4f6f9;"
                + "font-family:Arial,Helvetica,sans-serif;\">"
                + "<div style=\"max-width:620px;margin:0 auto;padding:24px 16px;\">"
                + "<div style=\"background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;\">"
                + "<div style=\"padding:20px 26px;background:#ffffff;border-bottom:4px solid #C90000;\">"
                + logoHtml
                + "</div>"
                + "<div style=\"padding:26px;\">"
                + paragraphs
                + "</div>"
                + "<div style=\"padding:16px 26px;background:#f4f6f9;border-top:1px solid #e5e7eb;\">"
                + "<p style=\"margin:0;color:#6b7280;font-size:12px;\">"
                + "Afriland First Bank — Portail digital Diaspora Onboarding.<br>"
                + "Ce message est envoyé automatiquement, merci de ne pas y répondre."
                + "</p></div></div></div></body></html>";
    }

    private static String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
