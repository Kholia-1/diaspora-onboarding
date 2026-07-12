package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.application.port.in.BrowseAuditLogsUseCase;
import com.afriland.diaspora.domain.model.AuditEntry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
public class BackofficeAuditLogsController {

    private final BrowseAuditLogsUseCase auditLogs;

    public BackofficeAuditLogsController(BrowseAuditLogsUseCase auditLogs) {
        this.auditLogs = auditLogs;
    }

    @GetMapping("/api/backoffice/audit-logs")
    public AuditLogsResponse listAuditLogs(
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Integer limit) {

        List<AuditLogDto> logs = auditLogs.list(actor, action, limit).stream()
                .map(AuditLogDto::from)
                .toList();

        return new AuditLogsResponse(true, logs.size(), logs);
    }

    public record AuditLogsResponse(boolean ok, int count, List<AuditLogDto> logs) {
    }

    public record AuditLogDto(
            Long id,
            String actor,
            String action,
            String resourceType,
            String resourceId,
            String details,
            String ipAddress,
            String userAgent,
            LocalDateTime createdAt) {

        static AuditLogDto from(AuditEntry entry) {
            return new AuditLogDto(
                    entry.id(),
                    entry.actor(),
                    entry.action(),
                    entry.resourceType(),
                    entry.resourceId(),
                    entry.details(),
                    entry.ipAddress(),
                    entry.userAgent(),
                    entry.createdAt());
        }
    }
}
