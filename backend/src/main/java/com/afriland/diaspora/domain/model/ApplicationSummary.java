package com.afriland.diaspora.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Vue liste d'un dossier — parité stricte avec le schéma Python ApplicationResponse
 * (app/schemas.py), champs dans le même ordre.
 */
public record ApplicationSummary(
        Long id,
        String reference,
        String lastName,
        String firstName,
        LocalDate birthDate,
        String birthPlace,
        String birthDepartment,
        String addressLocation,
        String postalBox,
        String phone,
        String whatsappPhoneFull,
        Boolean whatsappOtpVerified,
        LocalDateTime whatsappOtpVerifiedAt,
        String preOnboardingSessionId,
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
        String accountType,
        String preferredBranch,
        String accountPurpose,
        Boolean isPep,
        String pepDetails,
        String status,
        String riskLevel,
        Double kycScore,
        Double documentScore,
        String blackmoduleStatus,
        Double blackmoduleScore,
        String blackmoduleAlert,
        LocalDateTime createdAt) {
}
