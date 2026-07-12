package com.afriland.diaspora.domain.service;

import java.util.Set;

/**
 * Transition de statut après screening BLACKMODULE — parité avec
 * POST /api/applications/{id}/screen-blackmodule (app/routers/applications.py).
 */
public final class ScreeningRules {

    private static final Set<String> ALERT_STATUSES = Set.of("POSSIBLE_MATCH", "HIGH_RISK", "MATCH");
    private static final Set<String> UNAVAILABLE_STATUSES = Set.of("BLACKMODULE_ERROR", "BLACKMODULE_UNAVAILABLE");

    private ScreeningRules() {
    }

    public static String nextApplicationStatus(String screeningStatus, Double kycScore, Double documentScore) {
        String status = screeningStatus == null ? "" : screeningStatus;

        if (ALERT_STATUSES.contains(status)) {
            return "BLACKMODULE_ALERT";
        }
        if (UNAVAILABLE_STATUSES.contains(status)) {
            return "COMPLIANCE_REVIEW";
        }
        double kyc = kycScore == null ? 0 : kycScore;
        double document = documentScore == null ? 0 : documentScore;

        return (kyc >= 70 && document >= 70) ? "AUTO_KYC_OK" : "AUTO_KYC_REVIEW";
    }
}
