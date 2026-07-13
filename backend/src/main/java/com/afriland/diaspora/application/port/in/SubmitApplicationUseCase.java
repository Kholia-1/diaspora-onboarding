package com.afriland.diaspora.application.port.in;

import com.afriland.diaspora.domain.model.ApplicationSummary;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface SubmitApplicationUseCase {

    /**
     * Crée un dossier client (SUBMITTED), calcule le score KYC, journalise
     * APPLICATION_SUBMITTED, déclenche le screening et la notification (best-effort).
     * Retourne la vue liste du dossier (schéma ApplicationResponse).
     */
    ApplicationSummary submit(SubmitCommand command, String ipAddress, String userAgent);

    /** Payload de soumission — parité ApplicationCreate (snake_case côté web). */
    record SubmitCommand(
            String preOnboardingSessionId,
            String whatsappPhoneFull,
            Boolean whatsappOtpVerified,
            LocalDateTime whatsappOtpVerifiedAt,
            String lastName,
            String firstName,
            LocalDate birthDate,
            String birthPlace,
            String birthDepartment,
            String birthName,
            String residencyStatus,
            String addressLocation,
            String postalBox,
            String phone,
            String email,
            String contactPerson1Name,
            String contactPerson1Phone,
            String contactPerson2Name,
            String contactPerson2Phone,
            String fatherName,
            String motherName,
            String nationality,
            String residence,
            String sex,
            String maritalStatus,
            String matrimonialRegime,
            String identityDocumentNumber,
            LocalDate identityDocumentIssueDate,
            String identityDocumentIssuePlace,
            String rib,
            String incomeRange,
            String incomeCurrency,
            String activitySector,
            String activitySectorCode,
            String activitySubsector,
            String activitySubsectorCode,
            String sectorOfActivity,
            String economicSector,
            String accountObject,
            String accountObjectOther,
            String fundsOrigin,
            String fundsOriginOther,
            String accountType,
            String preferredBranch,
            String selectedPackageCode,
            String selectedPackageName,
            String selectedPackageCurrency,
            Double selectedPackageOpeningFee,
            Double selectedPackageSubscriptionFee,
            Double selectedPackageMonthlyFee,
            Boolean selectedPackagePaymentRequired,
            String accountPurpose,
            Boolean isPep,
            String pepDetails) {
    }
}
