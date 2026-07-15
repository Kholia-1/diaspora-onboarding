package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.adapter.in.web.backoffice.ApplicationSummaryDto;
import com.afriland.diaspora.application.port.in.TrackApplicationUseCase;
import com.afriland.diaspora.application.port.in.TrackApplicationUseCase.OpenedAccountPublic;
import com.afriland.diaspora.application.port.in.TrackApplicationUseCase.StatusList;
import com.afriland.diaspora.domain.model.ApplicationStatusView;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/** Suivi client PUBLIC (permitAll dans SecurityConfig) — parité app/routers/applications.py. */
@RestController
@RequestMapping("/api/applications")
public class TrackApplicationsController {

    private final TrackApplicationUseCase tracking;

    public TrackApplicationsController(TrackApplicationUseCase tracking) {
        this.tracking = tracking;
    }

    @GetMapping("/status-by-email")
    public StatusByEmailResponse statusByEmail(@RequestParam(required = false) String email) {
        StatusList result = tracking.statusByEmail(email);
        List<ApplicationStatusDto> applications =
                result.applications().stream().map(ApplicationStatusDto::from).toList();
        return new StatusByEmailResponse(result.identifier(), applications.size(), applications);
    }

    @GetMapping("/status-by-contact")
    public StatusByContactResponse statusByContact(@RequestParam(required = false) String identifier) {
        StatusList result = tracking.statusByContact(identifier);
        List<ApplicationStatusDto> applications =
                result.applications().stream().map(ApplicationStatusDto::from).toList();
        return new StatusByContactResponse(result.identifier(), applications.size(), applications);
    }

    @GetMapping("/status/{reference}")
    public StatusByReferenceDto statusByReference(@PathVariable String reference,
                                                  @RequestParam(required = false) String email) {
        return StatusByReferenceDto.from(tracking.statusByReference(reference, email));
    }

    /**
     * Dossier complet par id numérique — parité GET /api/applications/{id} (app/routers/applications.py:583).
     * Contrainte {id:\\d+} : ne capte pas les chemins littéraux (status-by-email, status/…).
     */
    @GetMapping("/{applicationId:\\d+}")
    public ApplicationSummaryDto getById(@PathVariable long applicationId) {
        return ApplicationSummaryDto.from(tracking.applicationById(applicationId));
    }

    @GetMapping("/{applicationReference}/opened-account-public")
    public OpenedAccountPublic openedAccountPublic(@PathVariable String applicationReference,
                                                   @RequestParam(required = false) String email) {
        return tracking.openedAccountPublic(applicationReference, email);
    }

    public record StatusByEmailResponse(String email, int count, List<ApplicationStatusDto> applications) {
    }

    public record StatusByContactResponse(String identifier, int count, List<ApplicationStatusDto> applications) {
    }

    /** Parité GET /api/applications/status/{reference} (payload réduit, sans champs package). */
    public record StatusByReferenceDto(
            String reference,
            String fullName,
            String email,
            String phone,
            String preferredBranch,
            String nationality,
            String residencyStatus,
            String status,
            String riskLevel,
            Double kycScore,
            Double documentScore,
            String blackmoduleStatus,
            LocalDateTime createdAt,
            String reviewDecision,
            String reviewComment) {

        static StatusByReferenceDto from(ApplicationStatusView a) {
            return new StatusByReferenceDto(
                    a.reference(),
                    a.fullName(),
                    a.email(),
                    a.phone(),
                    a.preferredBranch(),
                    a.nationality(),
                    a.residencyStatus(),
                    a.status(),
                    a.riskLevel(),
                    a.kycScore(),
                    a.documentScore(),
                    a.blackmoduleStatus(),
                    a.createdAt(),
                    a.reviewDecision(),
                    a.reviewComment());
        }
    }
}
