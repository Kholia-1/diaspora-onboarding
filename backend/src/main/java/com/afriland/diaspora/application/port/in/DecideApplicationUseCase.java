package com.afriland.diaspora.application.port.in;

import java.util.Map;

public interface DecideApplicationUseCase {

    /**
     * Enregistre une décision back-office sur un dossier (APPROVED / REJECTED /
     * NEED_MORE_DOCUMENTS / COMPLIANCE_REVIEW / ACCOUNT_OPENED), notifie le client
     * (best-effort) et journalise APPLICATION_DECISION.
     */
    DecisionResult decide(String actorUsername, long applicationId, DecisionCommand command,
                          String ipAddress, String userAgent);

    record DecisionCommand(
            String decision,
            String reviewedBy,
            String comment,
            String clientMessage,
            String finalRib,
            String accountNumber) {
    }

    record DecisionResult(
            String message,
            String reference,
            String decision,
            String reviewedBy,
            String status,
            Map<String, Object> paymentWorkflow,
            Map<String, Object> whatsappResult) {
    }
}
