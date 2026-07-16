package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.PreOnboardingDraftUseCase;
import com.afriland.diaspora.application.port.in.PreOnboardingOtpUseCase;
import com.afriland.diaspora.application.port.out.DraftStorePort;
import com.afriland.diaspora.application.port.out.OtpStorePort;
import com.afriland.diaspora.domain.model.PreOnboardingDraft;
import com.afriland.diaspora.domain.model.PreOnboardingOtpSession;
import com.afriland.diaspora.domain.service.PhoneNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Brouillon serveur et reprise de dossier — parité AFB_PREONBOARDING_DRAFT_RESUME_V1.
 *
 * <p>Sécurité : la sauvegarde exige une pré-inscription validée (OTP vérifié) ; la
 * recherche ne renvoie que des coordonnées masquées ; le code de réappropriation
 * n'est JAMAIS exposé au demandeur (pas de fallback à l'écran) ; l'ouverture du
 * brouillon exige la vérification de l'OTP de reprise.
 */
@Service
public class PreOnboardingDraftService implements PreOnboardingDraftUseCase {

    private static final Logger log = LoggerFactory.getLogger(PreOnboardingDraftService.class);
    private static final int MAX_FIELD_LENGTH = 2000;
    private static final List<String> EXCLUDED_FIELDS = List.of("password", "otp", "pre_onboarding_session_id");

    private final DraftStorePort drafts;
    private final OtpStorePort otpStore;
    private final PreOnboardingOtpUseCase otp;

    public PreOnboardingDraftService(DraftStorePort drafts, OtpStorePort otpStore, PreOnboardingOtpUseCase otp) {
        this.drafts = drafts;
        this.otpStore = otpStore;
        this.otp = otp;
    }

    @Override
    @Transactional
    public Map<String, Object> saveDraft(Map<String, Object> payload) {
        String sessionId = str(payload.get("session_id"));
        Object fields = payload.get("fields");

        if (sessionId.isEmpty()) {
            throw ApiException.badRequest("session_id requis.");
        }
        if (!(fields instanceof Map<?, ?> rawFields)) {
            throw ApiException.badRequest("fields (objet) requis.");
        }

        PreOnboardingOtpSession otpRecord = otpStore.findBySessionId(sessionId).orElse(null);
        if (otpRecord == null || !otpRecord.verified()) {
            throw new ApiException(403, "Pré-inscription non validée : brouillon refusé.");
        }

        Map<String, String> cleanFields = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawFields.entrySet()) {
            String key = str(entry.getKey());
            if (key.isEmpty() || EXCLUDED_FIELDS.contains(key) || entry.getValue() == null) {
                continue;
            }
            String value = String.valueOf(entry.getValue());
            cleanFields.put(key, value.length() > MAX_FIELD_LENGTH ? value.substring(0, MAX_FIELD_LENGTH) : value);
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        PreOnboardingDraft draft = drafts.findByDraftId(sessionId).orElseGet(() ->
                new PreOnboardingDraft(null, sessionId, null, null, "PERSONAL",
                        PreOnboardingDraft.STATUS_IN_PROGRESS, PreOnboardingDraft.STAGE_DOCUMENTS,
                        Map.of(), now, now));

        String email = firstNonBlank(str(payload.get("email")), draft.email()).toLowerCase();
        String phone = PhoneNormalizer.normalize(firstNonBlank(otpRecord.phone(), draft.phone()));
        String accountType = firstNonBlank(str(payload.get("account_type")), draft.accountType(), "PERSONAL");

        // AFB_DRAFT_STAGE_MARKER_V1 : marqueur de progression (jamais retrograde).
        String stage = str(payload.get("stage")).toUpperCase();
        if (!PreOnboardingDraft.STAGE_DOCUMENTS.equals(stage) && !PreOnboardingDraft.STAGE_FORM.equals(stage)) {
            stage = "";
        }

        draft = draft.withContact(email, phone, accountType)
                .withStage(stage)
                .withMergedFields(cleanFields, now);
        PreOnboardingDraft saved = drafts.save(draft);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("draft_id", sessionId);
        response.put("fields_saved", saved.fields().size());
        response.put("updated_at", saved.updatedAt());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> searchDrafts(Map<String, Object> payload) {
        String query = str(payload.get("query"));

        if (query.length() < 5) {
            throw ApiException.badRequest("Indiquez un email ou un numéro de téléphone complet.");
        }

        List<PreOnboardingDraft> found;
        if (query.contains("@")) {
            found = drafts.searchInProgressByEmail(query.toLowerCase());
        } else {
            String digits = query.replaceAll("\\D", "");
            if (digits.length() < 8) {
                throw ApiException.badRequest("Numéro de téléphone trop court.");
            }
            found = drafts.searchInProgressByPhoneSuffix(digits.substring(Math.max(0, digits.length() - 9)));
        }

        List<Map<String, Object>> results = found.stream().map(draft -> {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("draft_id", draft.draftId());
            item.put("masked_email", maskEmail(draft.email()));
            item.put("masked_phone", maskPhone(draft.phone()));
            item.put("account_type", firstNonBlank(draft.accountType(), "PERSONAL"));
            item.put("stage", firstNonBlank(draft.stage(), PreOnboardingDraft.STAGE_DOCUMENTS));
            item.put("updated_at", draft.updatedAt());
            item.put("fields_count", draft.fields() == null ? 0 : draft.fields().size());
            return item;
        }).toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("count", results.size());
        response.put("drafts", results);
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> claimDraft(Map<String, Object> payload) {
        PreOnboardingDraft draft = requireInProgress(str(payload.get("draft_id")));
        String resumeSession = "resume_" + draft.draftId();

        Map<String, Object> otpResponse;
        try {
            Map<String, Object> sendPayload = new LinkedHashMap<>();
            sendPayload.put("session_id", resumeSession);
            sendPayload.put("phone", draft.phone());
            sendPayload.put("email", draft.email());
            otpResponse = otp.sendOtp(sendPayload);
        } catch (ApiException e) {
            log.warn("[DRAFT][CLAIM] envoi OTP impossible pour {} : {}", draft.draftId(), e.getMessage());
            otpResponse = Map.of("whatsapp_sent", false, "email_sent", false);
        }

        boolean whatsappSent = Boolean.TRUE.equals(otpResponse.get("whatsapp_sent"));
        boolean emailSent = Boolean.TRUE.equals(otpResponse.get("email_sent"));

        // SÉCURITÉ : ne jamais renvoyer fallback_otp/demo_otp au demandeur — la preuve
        // de propriété passe uniquement par les canaux du titulaire (WhatsApp/email).
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", whatsappSent || emailSent);
        response.put("draft_id", draft.draftId());
        response.put("resume_session", resumeSession);
        response.put("masked_phone", maskPhone(draft.phone()));
        response.put("masked_email", maskEmail(draft.email()));
        response.put("whatsapp_sent", whatsappSent);
        response.put("email_sent", emailSent);
        response.put("message", "Un code de vérification vous a été envoyé par WhatsApp et par email.");
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> verifyDraft(Map<String, Object> payload) {
        PreOnboardingDraft draft = requireInProgress(str(payload.get("draft_id")));
        String otpCode = str(payload.get("otp")).replaceAll("\\D", "");

        Map<String, Object> verifyPayload = new LinkedHashMap<>();
        verifyPayload.put("session_id", "resume_" + draft.draftId());
        verifyPayload.put("phone", draft.phone());
        verifyPayload.put("otp", otpCode);

        Map<String, Object> result = otp.verifyOtp(verifyPayload);
        if (!Boolean.TRUE.equals(result.get("ok"))) {
            return result;
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("verified", true);
        response.put("draft_id", draft.draftId());
        response.put("message", "Vérification réussie. Votre dossier va s'ouvrir.");
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> openDraft(Map<String, Object> payload) {
        PreOnboardingDraft draft = requireInProgress(str(payload.get("draft_id")));

        PreOnboardingOtpSession resume = otpStore.findBySessionId("resume_" + draft.draftId()).orElse(null);
        if (resume == null || !resume.verified()) {
            throw new ApiException(403, "Vérification OTP requise avant d'ouvrir ce dossier.");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("draft_id", draft.draftId());
        response.put("session_id", draft.draftId());
        response.put("email", draft.email());
        response.put("phone", draft.phone());
        response.put("account_type", firstNonBlank(draft.accountType(), "PERSONAL"));
        response.put("stage", firstNonBlank(draft.stage(), PreOnboardingDraft.STAGE_DOCUMENTS));
        response.put("fields", draft.fields());
        response.put("updated_at", draft.updatedAt());
        return response;
    }

    @Override
    @Transactional
    public void markSubmitted(String draftId) {
        String clean = str(draftId);
        if (clean.isEmpty()) {
            return;
        }
        drafts.findByDraftId(clean).ifPresent(draft -> drafts.save(
                draft.withStatus(PreOnboardingDraft.STATUS_SUBMITTED, LocalDateTime.now(ZoneOffset.UTC))));
    }

    private PreOnboardingDraft requireInProgress(String draftId) {
        PreOnboardingDraft draft = draftId.isEmpty() ? null : drafts.findByDraftId(draftId).orElse(null);
        if (draft == null || !PreOnboardingDraft.STATUS_IN_PROGRESS.equals(draft.status())) {
            throw ApiException.notFound("Dossier de pré-inscription introuvable.");
        }
        return draft;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value).strip();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private static String maskEmail(String email) {
        String value = email == null ? "" : email;
        int at = value.indexOf('@');
        if (at < 0) {
            return value.length() > 2 ? value.substring(0, 2) + "***" : "***";
        }
        String local = value.substring(0, at);
        String kept = local.length() > 2 ? local.substring(0, 2) : local.substring(0, Math.min(1, local.length()));
        return kept + "*".repeat(Math.max(3, local.length() - kept.length())) + value.substring(at);
    }

    private static String maskPhone(String phone) {
        String value = phone == null ? "" : phone;
        String digits = value.replaceAll("\\D", "");
        if (digits.length() < 4) {
            return "****";
        }
        return value.substring(0, Math.min(4, value.length()))
                + "*".repeat(Math.max(3, digits.length() - 6))
                + digits.substring(digits.length() - 2);
    }
}
