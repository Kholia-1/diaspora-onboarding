package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.model.ApplicationDetail;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Règles métier d'ouverture de compte — parité stricte avec :
 * - app/services/application_business_rules.py (payment_required / payment_confirmed / can_open_account)
 * - app/routers/account_opening.py (précondition locale + verrou serveur _assert_payment_ok...).
 * Java pur, sans dépendance framework.
 */
public final class AccountOpeningRules {

    public static final Set<String> PAYMENT_CONFIRMED_VALUES = Set.of(
            "PAID", "PAYMENT_CONFIRMED", "CONFIRMED", "CAPTURED", "SUCCESS");

    private AccountOpeningRules() {
    }

    public record OpeningCheck(boolean allowed, String reason) {
    }

    /** Parité payment_required(application). */
    public static boolean paymentRequired(ApplicationDetail application) {
        boolean explicitRequired = Boolean.TRUE.equals(application.selectedPackagePaymentRequired());

        boolean amountRequired = List.of(
                        safeFloat(application.packagePaymentAmount()),
                        safeFloat(application.selectedPackageOpeningFee()),
                        safeFloat(application.selectedPackageSubscriptionFee()),
                        safeFloat(application.selectedPackageMonthlyFee()))
                .stream().anyMatch(value -> value > 0);

        String packageStatus = upper(application.packagePaymentStatus());
        if (packageStatus.equals("NOT_REQUIRED") || packageStatus.equals("NONE")) {
            return false;
        }

        return explicitRequired || amountRequired;
    }

    /** Parité payment_confirmed(application, payment) — paymentStatus = statut de la PaymentTransaction liée. */
    public static boolean paymentConfirmed(ApplicationDetail application, String paymentStatus) {
        if (PAYMENT_CONFIRMED_VALUES.contains(upper(application.packagePaymentStatus()))) {
            return true;
        }
        return paymentStatus != null && PAYMENT_CONFIRMED_VALUES.contains(upper(paymentStatus));
    }

    /** Parité can_open_account(application, payment). */
    public static OpeningCheck canOpenAccount(ApplicationDetail application, String paymentStatus) {
        if (!paymentRequired(application)) {
            return new OpeningCheck(true, "Paiement non requis.");
        }
        if (paymentConfirmed(application, paymentStatus)) {
            return new OpeningCheck(true, "Paiement confirmé.");
        }
        return new OpeningCheck(false, "Ouverture impossible : paiement package requis mais non confirmé.");
    }

    /** Parité de la précondition locale can_open_account de app/routers/account_opening.py. */
    public static boolean openingPrecondition(ApplicationDetail application) {
        String status = upper(application.status());
        String paymentStatus = upper(application.packagePaymentStatus());

        return status.equals("PAYMENT_CONFIRMED") || status.equals("ACCOUNT_OPENED")
                || paymentStatus.equals("PAID") || paymentStatus.equals("NOT_REQUIRED");
    }

    /** Parité _package_payment_required_before_account_opening. */
    public static boolean paymentRequiredBeforeOpening(ApplicationDetail application) {
        boolean explicitRequired = Boolean.TRUE.equals(application.selectedPackagePaymentRequired());
        String packagePaymentStatus = upper(application.packagePaymentStatus());

        double storedAmount = safeFloat(application.packagePaymentAmount());
        double selectedAmount = safeFloat(application.selectedPackageOpeningFee())
                + safeFloat(application.selectedPackageSubscriptionFee());

        boolean neutralStatus = packagePaymentStatus.equals("NOT_REQUIRED")
                || packagePaymentStatus.equals("NONE")
                || packagePaymentStatus.isEmpty();

        if (neutralStatus && !explicitRequired && storedAmount <= 0 && selectedAmount <= 0) {
            return false;
        }

        return explicitRequired
                || storedAmount > 0
                || selectedAmount > 0
                || packagePaymentStatus.equals("PENDING")
                || packagePaymentStatus.equals("PAYMENT_PENDING")
                || packagePaymentStatus.equals("APPROVED_PENDING_PAYMENT");
    }

    /** Parité _package_payment_confirmed_before_account_opening. */
    public static boolean paymentConfirmedBeforeOpening(ApplicationDetail application) {
        String appStatus = upper(application.status());
        String packagePaymentStatus = upper(application.packagePaymentStatus());

        return appStatus.equals("PAYMENT_CONFIRMED") || appStatus.equals("ACCOUNT_OPENED")
                || packagePaymentStatus.equals("PAYMENT_CONFIRMED") || packagePaymentStatus.equals("PAID");
    }

    /** Parité calculate_package_amount (frais d'ouverture + souscription). */
    public static double packageAmount(ApplicationDetail application) {
        return safeFloat(application.selectedPackageOpeningFee())
                + safeFloat(application.selectedPackageSubscriptionFee());
    }

    public static double safeFloat(BigDecimal value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private static String upper(String value) {
        return value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
    }
}
