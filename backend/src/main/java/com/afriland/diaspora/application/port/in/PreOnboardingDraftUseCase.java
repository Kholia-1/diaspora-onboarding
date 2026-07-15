package com.afriland.diaspora.application.port.in;

import java.util.Map;

/**
 * Brouillon de formulaire et reprise de dossier (parité
 * AFB_PREONBOARDING_DRAFT_RESUME_V1 du monolithe FastAPI).
 */
public interface PreOnboardingDraftUseCase {

    /** Sauvegarde/fusionne le brouillon (exige une pré-inscription validée : OTP vérifié). */
    Map<String, Object> saveDraft(Map<String, Object> payload);

    /** Recherche des brouillons en cours par téléphone ou email (résultats masqués). */
    Map<String, Object> searchDrafts(Map<String, Object> payload);

    /** Envoie l'OTP de réappropriation (WhatsApp + email) au titulaire du brouillon. */
    Map<String, Object> claimDraft(Map<String, Object> payload);

    /** Vérifie l'OTP de reprise (téléphone résolu côté serveur). */
    Map<String, Object> verifyDraft(Map<String, Object> payload);

    /** Renvoie le brouillon complet après vérification de l'OTP de reprise. */
    Map<String, Object> openDraft(Map<String, Object> payload);

    /** Marque le brouillon comme soumis (appelé à la création du dossier final). */
    void markSubmitted(String draftId);
}
