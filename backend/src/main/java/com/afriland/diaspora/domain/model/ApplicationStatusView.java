package com.afriland.diaspora.domain.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Vue "suivi client" d'un dossier — champs nécessaires aux endpoints publics
 * status-by-email / status-by-contact / status/{reference} / opened-account-public
 * (parité application_status_payload de app/routers/applications.py).
 */
public record ApplicationStatusView(
        Long id,
        String reference,
        String lastName,
        String firstName,
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
        String reviewComment,
        String clientMessage,
        String finalRib,
        String accountNumber,
        String rib,
        String selectedPackageCode,
        String selectedPackageName,
        String selectedPackageCurrency,
        BigDecimal selectedPackageOpeningFee,
        BigDecimal selectedPackageSubscriptionFee,
        BigDecimal selectedPackageMonthlyFee,
        Boolean selectedPackagePaymentRequired,
        String packagePaymentReference,
        String packagePaymentStatus,
        String packagePaymentProvider,
        BigDecimal packagePaymentAmount,
        String packagePaymentCurrency,
        String packagePaymentUrl) {

    /** Parité f"{last_name} {first_name}". */
    public String fullName() {
        return (lastName == null ? "" : lastName) + " " + (firstName == null ? "" : firstName);
    }
}
