package com.afriland.diaspora.domain.service;

import java.util.Set;

/**
 * Transition de statut du dossier après upload d'un document — parité avec la
 * logique AUTO_KYC de upload_document (app/routers/applications.py).
 */
public final class DocumentStatusRules {

    private static final Set<String> AUTO_OK_ELIGIBLE = Set.of("SUBMITTED", "AUTO_KYC_REVIEW");

    private DocumentStatusRules() {
    }

    public static String nextStatus(double kycScore, double documentScore, String currentStatus) {
        String status = currentStatus == null ? "" : currentStatus;

        if (kycScore >= 70 && documentScore >= 70) {
            return AUTO_OK_ELIGIBLE.contains(status) ? "AUTO_KYC_OK" : status;
        }
        if ("SUBMITTED".equals(status)) {
            return "AUTO_KYC_REVIEW";
        }
        return status;
    }
}
