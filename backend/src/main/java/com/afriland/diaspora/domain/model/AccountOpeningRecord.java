package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

public record AccountOpeningRecord(
        Long id,
        Long applicationId,
        String applicationReference,
        String clientEmail,
        String accountNumber,
        String rib,
        String status,
        LocalDateTime createdAt,
        String rawPayload) {

    public AccountOpeningRecord withAccountInfo(String newAccountNumber, String newRib, String newStatus,
                                                String newRawPayload) {
        return new AccountOpeningRecord(id, applicationId, applicationReference, clientEmail,
                newAccountNumber, newRib, newStatus, createdAt, newRawPayload);
    }
}
