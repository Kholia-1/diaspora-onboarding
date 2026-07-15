package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.PreOnboardingDraft;

import java.util.List;
import java.util.Optional;

/** Persistance des brouillons de formulaire (reprise de dossier). */
public interface DraftStorePort {

    Optional<PreOnboardingDraft> findByDraftId(String draftId);

    PreOnboardingDraft save(PreOnboardingDraft draft);

    /** Brouillons IN_PROGRESS correspondant exactement à l'email (insensible à la casse). */
    List<PreOnboardingDraft> searchInProgressByEmail(String email);

    /** Brouillons IN_PROGRESS dont le téléphone se termine par les chiffres donnés. */
    List<PreOnboardingDraft> searchInProgressByPhoneSuffix(String phoneDigitsSuffix);
}
