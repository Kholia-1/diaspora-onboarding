package com.afriland.diaspora.adapter.out.audit;

import com.afriland.diaspora.adapter.out.persistence.AuditLogEntity;
import com.afriland.diaspora.adapter.out.persistence.AuditLogJpaRepository;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.domain.model.AuditEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Component
public class JpaAuditAdapter implements AuditPort {

    private static final Logger log = LoggerFactory.getLogger(JpaAuditAdapter.class);

    private static final Sort SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final AuditLogJpaRepository repository;

    public JpaAuditAdapter(AuditLogJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public void log(String actor, String action, String resourceType, String resourceId,
                    String details, String ipAddress, String userAgent) {
        // Best effort : un échec d'audit ne doit pas bloquer l'action métier (parité AUDIT_SERVICE_V1).
        try {
            AuditLogEntity entity = new AuditLogEntity();
            entity.setActor(truncate(actor == null || actor.isEmpty() ? "anonyme" : actor, 150));
            entity.setAction(truncate(action, 100));
            entity.setResourceType(truncate(resourceType, 100));
            entity.setResourceId(truncate(resourceId, 100));
            entity.setDetails(details);
            entity.setIpAddress(truncate(ipAddress, 60));
            entity.setUserAgent(truncate(userAgent, 300));
            entity.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
            repository.save(entity);
        } catch (Exception exc) {
            log.warn("[AUDIT] Échec d'enregistrement de l'action '{}': {}", action, exc.getMessage());
        }
    }

    @Override
    public List<AuditEntry> find(String actorContains, String actionExact, int limit) {
        Pageable page = PageRequest.of(0, limit, SORT);

        List<AuditLogEntity> entities;
        if (actorContains != null && actionExact != null) {
            entities = repository.findByActorContainingIgnoreCaseAndAction(actorContains, actionExact, page);
        } else if (actorContains != null) {
            entities = repository.findByActorContainingIgnoreCase(actorContains, page);
        } else if (actionExact != null) {
            entities = repository.findByAction(actionExact, page);
        } else {
            entities = repository.findAllBy(page);
        }

        return entities.stream().map(JpaAuditAdapter::toDomain).toList();
    }

    private static AuditEntry toDomain(AuditLogEntity entity) {
        return new AuditEntry(
                entity.getId(),
                entity.getActor(),
                entity.getAction(),
                entity.getResourceType(),
                entity.getResourceId(),
                entity.getDetails(),
                entity.getIpAddress(),
                entity.getUserAgent(),
                entity.getCreatedAt());
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
