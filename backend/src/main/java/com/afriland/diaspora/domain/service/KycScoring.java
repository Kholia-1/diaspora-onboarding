package com.afriland.diaspora.domain.service;

import java.time.LocalDate;

/**
 * Calcul du score KYC — parité stricte avec calculate_kyc_score (app/routers/applications.py).
 * Score borné [0, 100]. Java pur.
 */
public final class KycScoring {

    private KycScoring() {
    }

    /** Champs du dossier utilisés par le score (valeurs "truthy" = non nulles / non vides). */
    public record Profile(
            String firstName,
            String lastName,
            LocalDate birthDate,
            String birthPlace,
            String birthDepartment,
            String birthName,
            String residencyStatus,
            String phone,
            String email,
            String addressLocation,
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
            String identityDocumentNumber,
            LocalDate identityDocumentIssueDate,
            String identityDocumentIssuePlace,
            String accountType,
            String preferredBranch,
            String accountObject,
            String fundsOrigin,
            String rib,
            boolean isPep) {
    }

    public static int calculate(Profile p) {
        int score = 0;

        if (has(p.firstName()) && has(p.lastName())) {
            score += 10;
        }
        if (p.birthDate() != null && has(p.birthPlace())) {
            score += 10;
        }
        if (has(p.birthDepartment())) {
            score += 5;
        }
        if (has(p.birthName())) {
            score += 5;
        }
        if (has(p.residencyStatus())) {
            score += 5;
        }
        if (has(p.phone()) && has(p.email())) {
            score += 10;
        }
        if (has(p.addressLocation())) {
            score += 10;
        }
        if (has(p.contactPerson1Name()) && has(p.contactPerson1Phone())) {
            score += 10;
        }
        if (has(p.contactPerson2Name()) && has(p.contactPerson2Phone())) {
            score += 5;
        }
        if (has(p.fatherName()) && has(p.motherName())) {
            score += 10;
        }
        if (has(p.nationality()) && has(p.residence())) {
            score += 10;
        }
        if (has(p.sex()) && has(p.maritalStatus())) {
            score += 5;
        }
        if (has(p.identityDocumentNumber()) && p.identityDocumentIssueDate() != null
                && has(p.identityDocumentIssuePlace())) {
            score += 15;
        }
        if (has(p.accountType()) && has(p.preferredBranch())) {
            score += 10;
        }
        if (has(p.accountObject()) && has(p.fundsOrigin())) {
            score += 10;
        }
        if (has(p.rib())) {
            score += 5;
        }
        if (p.isPep()) {
            score -= 10;
        } else {
            score += 5;
        }

        return Math.max(0, Math.min(score, 100));
    }

    private static boolean has(String value) {
        return value != null && !value.isBlank();
    }
}
