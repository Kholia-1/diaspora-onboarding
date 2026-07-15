package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.PreOnboardingOtpUseCase;
import com.afriland.diaspora.application.port.out.EmailPort;
import com.afriland.diaspora.application.port.out.NotificationPort;
import com.afriland.diaspora.application.port.out.OtpStorePort;
import com.afriland.diaspora.config.AppProperties;
import com.afriland.diaspora.domain.model.PreOnboardingOtpSession;
import com.afriland.diaspora.domain.service.OtpCodeGenerator;
import com.afriland.diaspora.domain.service.OtpHasher;
import com.afriland.diaspora.domain.service.OtpVerificationPolicy;
import com.afriland.diaspora.domain.service.OtpVerificationPolicy.Result;
import com.afriland.diaspora.domain.service.CallbellPhoneNormalizer;
import com.afriland.diaspora.domain.service.PhoneNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class PreOnboardingOtpService implements PreOnboardingOtpUseCase {

    private static final Logger log = LoggerFactory.getLogger(PreOnboardingOtpService.class);

    private final OtpStorePort store;
    private final NotificationPort notifications;
    private final EmailPort emails;
    private final AppProperties.PreOnboarding.Otp otpConfig;
    private final String defaultCountryCode;

    public PreOnboardingOtpService(OtpStorePort store, NotificationPort notifications, EmailPort emails,
                                   AppProperties properties) {
        this.store = store;
        this.notifications = notifications;
        this.emails = emails;
        this.otpConfig = properties.preOnboarding().otp();
        this.defaultCountryCode = properties.callbell().defaultCountryCode();
    }

    @Override
    @Transactional
    public Map<String, Object> sendOtp(Map<String, Object> payload) {
        String sessionId = firstNonEmpty(payload, "session_id");
        String phone = normalizePhone(firstNonEmpty(payload, "phone", "whatsapp", "whatsapp_phone"));

        if (sessionId.isEmpty()) {
            throw ApiException.badRequest("session_id requis.");
        }
        if (phone.length() < 8) {
            throw ApiException.badRequest("Numéro WhatsApp invalide.");
        }

        String otp = OtpCodeGenerator.generate();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime expiresAt = now.plusMinutes(otpConfig.ttlMinutes());

        String otpMessage = "Votre code de vérification Afriland First Bank est : " + otp + ". "
                + "Il expire dans " + otpConfig.ttlMinutes() + " minutes. "
                + "Ne partagez pas ce code.";

        // Envoi WhatsApp best-effort. En Phase 3, l'adapter NoOp ne transmet rien réellement :
        // whatsapp_sent reste false → on bascule en mode démo / fallback affiché.
        Map<String, Object> whatsappResult;
        try {
            whatsappResult = notifications.sendMessage(phone, otpMessage);
        } catch (Exception exc) {
            whatsappResult = new LinkedHashMap<>();
            whatsappResult.put("success", false);
            whatsappResult.put("status", "WHATSAPP_EXCEPTION");
            whatsappResult.put("error", String.valueOf(exc.getMessage()));
        }

        boolean whatsappSent = Boolean.TRUE.equals(whatsappResult.get("success"));
        String whatsappStatus = String.valueOf(
                whatsappResult.getOrDefault("status", "UNKNOWN")).toUpperCase(Locale.ROOT);

        // OTP_DUAL_CHANNEL_EMAIL_V1 — le code part aussi par email quand l'adresse est
        // fournie par le pré-onboarding. Best-effort, jamais bloquant.
        String email = firstNonEmpty(payload, "email");
        Map<String, Object> emailResult = null;
        if (email.contains("@")) {
            try {
                emailResult = emails.sendEmail(
                        email,
                        "Votre code de vérification - Afriland First Bank",
                        otpMessage);
            } catch (Exception exc) {
                emailResult = new LinkedHashMap<>();
                emailResult.put("success", false);
                emailResult.put("status", "EMAIL_EXCEPTION");
                emailResult.put("error", String.valueOf(exc.getMessage()));
            }
        }

        boolean emailSent = emailResult != null && Boolean.TRUE.equals(emailResult.get("success"));
        String emailStatus = emailResult == null
                ? "NOT_ATTEMPTED"
                : String.valueOf(emailResult.getOrDefault("status", "UNKNOWN")).toUpperCase(Locale.ROOT);
        boolean anySent = whatsappSent || emailSent;

        store.save(new PreOnboardingOtpSession(
                null,
                sessionId,
                phone,
                OtpHasher.hash(otpConfig.secret(), sessionId, phone, otp),
                0,
                null,
                expiresAt,
                whatsappStatus,
                null,
                now,
                now));

        boolean demoMode = otpConfig.demoMode();
        boolean fallbackDisplay = otpConfig.fallbackDisplay();

        Map<String, Object> delivery = new LinkedHashMap<>();
        delivery.put("success", whatsappSent);
        delivery.put("status", whatsappStatus);
        delivery.put("http_status", whatsappResult.get("http_status"));
        delivery.put("provider", whatsappResult.get("provider"));
        delivery.put("callbell_message_uuid", null);
        delivery.put("callbell_message_status", null);

        String sentMessage;
        if (whatsappSent && emailSent) {
            sentMessage = "Code OTP envoyé par WhatsApp et par email.";
        } else if (whatsappSent) {
            sentMessage = "Code OTP en cours d'envoi via WhatsApp.";
        } else if (emailSent) {
            // AFB_OTP_EMAIL_FALLBACK_MESSAGE_V1 : WhatsApp non remis mais email
            // parti -> orienter clairement le client vers sa boîte mail.
            sentMessage = "Le message WhatsApp n'a pas pu être remis. "
                    + "Votre code vous a été envoyé par email — vérifiez votre boîte de réception.";
        } else {
            sentMessage = "L'envoi du code a échoué (WhatsApp et email).";
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", anySent || demoMode);
        response.put("message", sentMessage);
        response.put("phone", phone);
        response.put("expires_at", expiresAt);
        response.put("demo_mode", demoMode);
        response.put("whatsapp_sent", whatsappSent);
        response.put("whatsapp_delivery_status", whatsappStatus);
        response.put("email_sent", emailSent);
        response.put("email_delivery_status", emailStatus);
        response.put("delivery", delivery);

        if (demoMode) {
            response.put("demo_otp", otp);
        }

        if (!anySent && !demoMode && fallbackDisplay) {
            response.put("ok", true);
            response.put("fallback_otp", otp);
            response.put("fallback_display", true);
            response.put("message",
                    "Envoi WhatsApp indisponible. Utilisez le code affiché à l'écran pour continuer.");
        }

        log.info("[PRE-ONBOARDING OTP] session={} phone={} otp={} delivery={} sent={} email={} expires_at={}",
                sessionId, phone, demoMode ? otp : "******", whatsappStatus, whatsappSent, emailStatus, expiresAt);

        if (!anySent && !demoMode && !fallbackDisplay) {
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("message", "Impossible d'envoyer le code OTP par WhatsApp ou par email.");
            detail.put("phone", phone);
            detail.put("delivery_status", whatsappStatus);
            detail.put("http_status", whatsappResult.get("http_status"));
            throw new ApiException(502, (Object) detail);
        }

        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> verifyOtp(Map<String, Object> payload) {
        String sessionId = firstNonEmpty(payload, "session_id");
        String phone = normalizePhone(firstNonEmpty(payload, "phone", "whatsapp", "whatsapp_phone"));
        String otp = digitsOnly(firstNonEmpty(payload, "otp"));

        if (sessionId.isEmpty()) {
            throw ApiException.badRequest("session_id requis.");
        }
        if (phone.length() < 8) {
            throw ApiException.badRequest("Numéro WhatsApp invalide.");
        }
        if (otp.length() != 6) {
            throw ApiException.badRequest("Code OTP invalide.");
        }

        PreOnboardingOtpSession record = store.findBySessionId(sessionId)
                .orElseThrow(() -> ApiException.notFound("Aucun code OTP trouvé pour cette session."));

        if (record.verified()) {
            Map<String, Object> already = new LinkedHashMap<>();
            already.put("ok", true);
            already.put("verified", true);
            already.put("message", "WhatsApp déjà vérifié.");
            already.put("phone", record.phone());
            return already;
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String providedHash = OtpHasher.hash(otpConfig.secret(), sessionId, phone, otp);

        Result result = OtpVerificationPolicy.evaluate(record, phone, providedHash, now, otpConfig.maxAttempts());

        switch (result.decision()) {
            case PHONE_MISMATCH ->
                    throw ApiException.badRequest("Le numéro WhatsApp ne correspond pas au code envoyé.");
            case EXPIRED ->
                    throw ApiException.badRequest("Code OTP expiré. Veuillez demander un nouveau code.");
            case MAX_ATTEMPTS ->
                    throw new ApiException(429, "Nombre maximum de tentatives atteint. Demandez un nouveau code.");
            case INCORRECT -> {
                store.save(record.withAttempts(record.attempts() + 1, now));
                throw ApiException.badRequest(
                        "Code OTP incorrect. Tentatives restantes : " + result.remainingAttempts() + ".");
            }
            case ALREADY_VERIFIED, SUCCESS -> {
                // ALREADY_VERIFIED déjà court-circuité ci-dessus.
            }
        }

        store.save(record.withVerified(now));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("verified", true);
        response.put("message", "Numéro WhatsApp vérifié.");
        response.put("session_id", sessionId);
        response.put("phone", phone);
        response.put("whatsapp_phone_full", phone);
        response.put("verified_at", now);
        response.put("whatsapp_otp_verified", true);
        response.put("whatsapp_otp_verified_at", now);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> otpStatus(String sessionId) {
        String cleanSession = sessionId == null ? "" : sessionId.strip();
        PreOnboardingOtpSession record = store.findBySessionId(cleanSession).orElse(null);

        Map<String, Object> otp = new LinkedHashMap<>();
        otp.put("sent", record != null);
        otp.put("verified", record != null && record.verified());
        otp.put("expires_at", record != null ? record.expiresAt() : null);
        otp.put("attempts", record != null ? record.attempts() : 0);
        otp.put("max_attempts", otpConfig.maxAttempts());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("session_id", cleanSession);
        response.put("otp", otp);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> deliveryStatus(String sessionId) {
        String cleanSession = sessionId == null ? "" : sessionId.strip();
        PreOnboardingOtpSession record = store.findBySessionId(cleanSession)
                .orElseThrow(() -> ApiException.notFound("Aucun OTP trouvé pour cette session."));

        // Phase 3 : le statut de livraison reste celui persisté à l'envoi (polling Callbell en Phase 4).
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("session_id", cleanSession);
        response.put("phone", record.phone());
        response.put("whatsapp_delivery_status", record.deliveryStatus());
        response.put("whatsapp_http_status", null);
        response.put("callbell_message_uuid", record.deliveryMessageUuid());
        response.put("callbell_message_status", record.deliveryStatus());
        response.put("callbell_live_status", null);
        response.put("callbell_live_errors", new ArrayList<>());
        response.put("live", null);
        return response;
    }

    /**
     * Normalisation pays-consciente du numéro WhatsApp : applique d'abord la même
     * logique que l'envoi Callbell (indicatif pays par défaut pour un numéro local,
     * gestion de « + » / « 00 » / « 237 »), puis garantit un préfixe « + » si aucune
     * règle n'a permis de déduire l'indicatif. Corrige le cas où un local camerounais
     * « 699000000 » donnait « +699000000 » (237 manquant) — la couche Callbell voyait
     * alors un « + » et ne complétait plus l'indicatif. Divergence assumée avec le
     * legacy FastAPI (_normalize_phone), qui garde ce bug.
     */
    private String normalizePhone(String raw) {
        String normalized = CallbellPhoneNormalizer.normalize(raw, defaultCountryCode);
        return normalized.startsWith("+") ? normalized : PhoneNormalizer.normalize(normalized);
    }

    /** Premier champ non vide parmi une liste de clés (parité `a or b or c`). */
    private static String firstNonEmpty(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            Object value = payload.get(key);
            if (value != null) {
                String s = String.valueOf(value).strip();
                if (!s.isEmpty()) {
                    return s;
                }
            }
        }
        return "";
    }

    private static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }
}
