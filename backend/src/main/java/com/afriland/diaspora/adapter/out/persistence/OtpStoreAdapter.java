package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.OtpStorePort;
import com.afriland.diaspora.domain.model.PreOnboardingOtpSession;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class OtpStoreAdapter implements OtpStorePort {

    private final PreOnboardingSessionJpaRepository repository;

    public OtpStoreAdapter(PreOnboardingSessionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<PreOnboardingOtpSession> findBySessionId(String sessionId) {
        return repository.findBySessionId(sessionId).map(OtpStoreAdapter::toDomain);
    }

    @Override
    public PreOnboardingOtpSession save(PreOnboardingOtpSession session) {
        // Upsert par clé métier session_id (la colonne est UNIQUE).
        PreOnboardingSessionEntity entity = repository.findBySessionId(session.sessionId())
                .orElseGet(PreOnboardingSessionEntity::new);

        entity.setSessionId(session.sessionId());
        entity.setPhone(session.phone());
        entity.setOtpHash(session.otpHash());
        entity.setAttempts(session.attempts());
        entity.setVerifiedAt(session.verifiedAt());
        entity.setExpiresAt(session.expiresAt());
        entity.setDeliveryStatus(session.deliveryStatus());
        entity.setDeliveryMessageUuid(session.deliveryMessageUuid());
        entity.setCreatedAt(session.createdAt());
        entity.setUpdatedAt(session.updatedAt());

        return toDomain(repository.save(entity));
    }

    private static PreOnboardingOtpSession toDomain(PreOnboardingSessionEntity entity) {
        return new PreOnboardingOtpSession(
                entity.getId(),
                entity.getSessionId(),
                entity.getPhone(),
                entity.getOtpHash(),
                entity.getAttempts() == null ? 0 : entity.getAttempts(),
                entity.getVerifiedAt(),
                entity.getExpiresAt(),
                entity.getDeliveryStatus(),
                entity.getDeliveryMessageUuid(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
