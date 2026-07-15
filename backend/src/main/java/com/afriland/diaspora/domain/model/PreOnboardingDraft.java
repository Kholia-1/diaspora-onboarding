package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Brouillon de formulaire d'ouverture de compte (reprise de dossier).
 * Parité AFB_PREONBOARDING_DRAFT_RESUME_V1 du monolithe FastAPI.
 */
public record PreOnboardingDraft(
        Long id,
        String draftId,
        String email,
        String phone,
        String accountType,
        String status,
        Map<String, String> fields,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_SUBMITTED = "SUBMITTED";

    public PreOnboardingDraft withMergedFields(Map<String, String> extra, LocalDateTime now) {
        Map<String, String> merged = new LinkedHashMap<>(fields == null ? Map.of() : fields);
        if (extra != null) {
            merged.putAll(extra);
        }
        return new PreOnboardingDraft(id, draftId, email, phone, accountType, status, merged, createdAt, now);
    }

    public PreOnboardingDraft withContact(String newEmail, String newPhone, String newAccountType) {
        return new PreOnboardingDraft(id, draftId, newEmail, newPhone, newAccountType, status,
                fields, createdAt, updatedAt);
    }

    public PreOnboardingDraft withStatus(String newStatus, LocalDateTime now) {
        return new PreOnboardingDraft(id, draftId, email, phone, accountType, newStatus,
                fields, createdAt, now);
    }
}
