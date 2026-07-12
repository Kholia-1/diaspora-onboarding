package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.adapter.in.web.HttpRequestMeta;
import com.afriland.diaspora.application.port.in.DecideApplicationUseCase;
import com.afriland.diaspora.application.port.in.DecideApplicationUseCase.DecisionCommand;
import com.afriland.diaspora.application.port.in.DecideApplicationUseCase.DecisionResult;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BackofficeDecisionController {

    private final DecideApplicationUseCase decisions;

    public BackofficeDecisionController(DecideApplicationUseCase decisions) {
        this.decisions = decisions;
    }

    @PostMapping("/api/backoffice/applications/{applicationId}/decision")
    public DecisionResponse decide(@PathVariable long applicationId,
                                   @RequestBody DecisionRequest payload,
                                   Authentication authentication,
                                   HttpServletRequest request) {
        String actor = authentication != null ? authentication.getName() : null;
        // Parité : FastAPI exige reviewed_by dans le payload ; le nouveau front ne
        // l'envoie pas — on retombe alors sur l'utilisateur de session.
        String reviewedBy = payload.reviewedBy() != null && !payload.reviewedBy().isBlank()
                ? payload.reviewedBy()
                : actor;

        DecisionResult result = decisions.decide(
                actor,
                applicationId,
                new DecisionCommand(
                        payload.decision(),
                        reviewedBy,
                        payload.comment(),
                        payload.clientMessage(),
                        payload.finalRib(),
                        payload.accountNumber()),
                HttpRequestMeta.clientIp(request),
                HttpRequestMeta.userAgent(request));

        return new DecisionResponse(
                result.message(),
                result.reference(),
                result.decision(),
                result.reviewedBy(),
                result.status(),
                result.paymentWorkflow(),
                result.whatsappResult());
    }

    /** Parité schéma BackOfficeDecision (app/schemas.py). */
    public record DecisionRequest(
            String decision,
            String reviewedBy,
            String comment,
            String clientMessage,
            String finalRib,
            String accountNumber) {
    }

    public record DecisionResponse(
            String message,
            String reference,
            String decision,
            String reviewedBy,
            String status,
            Object paymentWorkflow,
            Object whatsappResult) {
    }
}
