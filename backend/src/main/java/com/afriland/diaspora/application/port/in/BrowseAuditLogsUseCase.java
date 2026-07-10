package com.afriland.diaspora.application.port.in;

import com.afriland.diaspora.domain.model.AuditEntry;

import java.util.List;

public interface BrowseAuditLogsUseCase {

    /**
     * Journal d'audit filtré : actor en "ilike", action exacte, limite clampée [1..1000] (défaut 200).
     * Tri created_at desc puis id desc.
     */
    List<AuditEntry> list(String actor, String action, Integer limit);
}
