package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.domain.model.ApplicationStatusView;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Parité application_status_payload (app/routers/applications.py). */
public record ApplicationStatusDto(
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
        String reviewComment,
        String clientMessage,
        String finalRib,
        String accountNumber,
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

    public static ApplicationStatusDto from(ApplicationStatusView a) {
        return new ApplicationStatusDto(
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
                a.reviewComment(),
                a.clientMessage(),
                a.finalRib(),
                a.accountNumber(),
                a.selectedPackageCode(),
                a.selectedPackageName(),
                a.selectedPackageCurrency(),
                a.selectedPackageOpeningFee(),
                a.selectedPackageSubscriptionFee(),
                a.selectedPackageMonthlyFee(),
                a.selectedPackagePaymentRequired(),
                a.packagePaymentReference(),
                a.packagePaymentStatus(),
                a.packagePaymentProvider(),
                a.packagePaymentAmount(),
                a.packagePaymentCurrency(),
                a.packagePaymentUrl());
    }
}
