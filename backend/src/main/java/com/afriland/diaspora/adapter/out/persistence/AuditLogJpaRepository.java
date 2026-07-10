package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogJpaRepository extends JpaRepository<AuditLogEntity, Long> {

    List<AuditLogEntity> findAllBy(Pageable pageable);

    List<AuditLogEntity> findByActorContainingIgnoreCase(String actor, Pageable pageable);

    List<AuditLogEntity> findByAction(String action, Pageable pageable);

    List<AuditLogEntity> findByActorContainingIgnoreCaseAndAction(String actor, String action, Pageable pageable);
}
