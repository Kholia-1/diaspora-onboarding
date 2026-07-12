package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.port.in.ScreenApplicationUseCase;
import com.afriland.diaspora.application.port.in.ScreenApplicationUseCase.ScreeningOutcome;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScreeningController {

    private final ScreenApplicationUseCase screening;

    public ScreeningController(ScreenApplicationUseCase screening) {
        this.screening = screening;
    }

    @PostMapping("/api/applications/{applicationId}/screen-blackmodule")
    public ScreeningResponse screen(@PathVariable long applicationId) {
        ScreeningOutcome outcome = screening.screen(applicationId);

        return new ScreeningResponse(
                outcome.message(),
                outcome.applicationReference(),
                outcome.blackmoduleStatus(),
                outcome.blackmoduleScore(),
                outcome.riskLevel(),
                outcome.alert(),
                outcome.newStatus());
    }

    /** Parité réponse Python : message, application_reference, blackmodule_status, ... */
    public record ScreeningResponse(
            String message,
            String applicationReference,
            String blackmoduleStatus,
            Double blackmoduleScore,
            String riskLevel,
            String alert,
            String newStatus) {
    }
}
