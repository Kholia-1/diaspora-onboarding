package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.PreOnboardingOtpSession;

import java.util.Optional;

public interface OtpStorePort {

    Optional<PreOnboardingOtpSession> findBySessionId(String sessionId);

    /** Insère ou met à jour la session (clé métier : session_id). */
    PreOnboardingOtpSession save(PreOnboardingOtpSession session);
}
