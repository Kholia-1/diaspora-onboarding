package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

public record AuditEntry(
        Long id,
        String actor,
        String action,
        String resourceType,
        String resourceId,
        String details,
        String ipAddress,
        String userAgent,
        LocalDateTime createdAt) {
}
