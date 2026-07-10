package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.port.in.BrowseAuditLogsUseCase;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.domain.model.AuditEntry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AuditLogService implements BrowseAuditLogsUseCase {

    private final AuditPort audit;

    public AuditLogService(AuditPort audit) {
        this.audit = audit;
    }

    @Override
    public List<AuditEntry> list(String actor, String action, Integer limit) {
        int effectiveLimit = limit == null ? 200 : limit;
        effectiveLimit = Math.max(1, Math.min(effectiveLimit, 1000));

        String actorFilter = actor == null || actor.isEmpty() ? null : actor;
        String actionFilter = action == null || action.isEmpty() ? null : action;

        return audit.find(actorFilter, actionFilter, effectiveLimit);
    }
}
