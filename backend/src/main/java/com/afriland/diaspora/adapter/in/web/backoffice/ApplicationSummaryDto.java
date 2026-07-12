package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.domain.model.ApplicationSummary;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Parité stricte avec ApplicationResponse (app/schemas.py).
 * Les champs contact_person_N_* sont annotés explicitement : la stratégie SNAKE_CASE
 * produirait "contact_person1_name" à cause du chiffre.
 */
public record ApplicationSummaryDto(
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
        @JsonProperty("contact_person_1_name") String contactPerson1Name,
        @JsonProperty("contact_person_1_phone") String contactPerson1Phone,
        @JsonProperty("contact_person_2_name") String contactPerson2Name,
        @JsonProperty("contact_person_2_phone") String contactPerson2Phone,
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

    public static ApplicationSummaryDto from(ApplicationSummary a) {
        return new ApplicationSummaryDto(
                a.id(),
                a.reference(),
                a.lastName(),
                a.firstName(),
                a.birthDate(),
                a.birthPlace(),
                a.birthDepartment(),
                a.addressLocation(),
                a.postalBox(),
                a.phone(),
                a.whatsappPhoneFull(),
                a.whatsappOtpVerified() == null ? Boolean.FALSE : a.whatsappOtpVerified(),
                a.whatsappOtpVerifiedAt(),
                a.preOnboardingSessionId(),
                a.email(),
                a.contactPerson1Name(),
                a.contactPerson1Phone(),
                a.contactPerson2Name(),
                a.contactPerson2Phone(),
                a.fatherName(),
                a.motherName(),
                a.nationality(),
                a.residence(),
                a.sex(),
                a.maritalStatus(),
                a.matrimonialRegime(),
                a.identityDocumentNumber(),
                a.identityDocumentIssueDate(),
                a.identityDocumentIssuePlace(),
                a.accountType(),
                a.preferredBranch(),
                a.accountPurpose(),
                a.isPep(),
                a.pepDetails(),
                a.status(),
                a.riskLevel(),
                a.kycScore(),
                a.documentScore(),
                a.blackmoduleStatus(),
                a.blackmoduleScore(),
                a.blackmoduleAlert(),
                a.createdAt());
    }
}
