package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.AuditEntry;

import java.util.List;

public interface AuditPort {

    /**
     * Enregistre une action dans le journal d'audit. Ne doit jamais faire échouer
     * l'action métier (best effort, parité AUDIT_SERVICE_V1).
     */
    void log(String actor, String action, String resourceType, String resourceId,
             String details, String ipAddress, String userAgent);

    /** Recherche : actor "contient" (insensible à la casse), action exacte, tri created_at desc puis id desc. */
    List<AuditEntry> find(String actorContains, String actionExact, int limit);
}
