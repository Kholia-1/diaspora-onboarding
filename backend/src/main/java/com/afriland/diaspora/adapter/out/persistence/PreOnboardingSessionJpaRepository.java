package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PreOnboardingSessionJpaRepository extends JpaRepository<PreOnboardingSessionEntity, Long> {

    Optional<PreOnboardingSessionEntity> findBySessionId(String sessionId);
}
