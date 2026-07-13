package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.model.ApplicationDetail;

import java.util.UUID;

/**
 * Règles de paiement package — parité avec package_payment_workflow.py /
 * mastercard_payment_service.py. Java pur.
 */
public final class PackagePaymentRules {

    private PackagePaymentRules() {
    }

    /** Parité calculate_package_amount : frais d'ouverture + souscription. */
    public static double calculateAmount(ApplicationDetail application) {
        return AccountOpeningRules.packageAmount(application);
    }

    /** Parité is_package_payment_required : flag explicite OU montant > 0. */
    public static boolean isPaymentRequired(ApplicationDetail application) {
        boolean explicitRequired = Boolean.TRUE.equals(application.selectedPackagePaymentRequired());
        return explicitRequired || calculateAmount(application) > 0;
    }

    /** Parité build_payment_reference : "PAY-" + 12 hex majuscules. */
    public static String buildPaymentReference() {
        return "PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
}
