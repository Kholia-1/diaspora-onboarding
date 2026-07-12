package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.model.ApplicationDetail;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccountOpeningRulesTest {

    @Test
    void paymentNotRequiredWhenNoFlagAndNoAmount() {
        ApplicationDetail app = application(null, null, null, null, null, null, null);
        assertFalse(AccountOpeningRules.paymentRequired(app));

        var check = AccountOpeningRules.canOpenAccount(app, null);
        assertTrue(check.allowed());
        assertEquals("Paiement non requis.", check.reason());
    }

    @Test
    void paymentRequiredWhenExplicitFlagOrPositiveAmount() {
        assertTrue(AccountOpeningRules.paymentRequired(
                application(true, null, null, null, null, null, null)));
        assertTrue(AccountOpeningRules.paymentRequired(
                application(null, new BigDecimal("5000"), null, null, null, null, null)));
        assertTrue(AccountOpeningRules.paymentRequired(
                application(null, null, null, null, new BigDecimal("1500"), null, null)));
    }

    @Test
    void notRequiredStatusesShortCircuitPaymentRequired() {
        // Statut NOT_REQUIRED/NONE : jamais de paiement requis même avec montant.
        assertFalse(AccountOpeningRules.paymentRequired(
                application(true, new BigDecimal("5000"), "NOT_REQUIRED", null, null, null, null)));
        assertFalse(AccountOpeningRules.paymentRequired(
                application(true, new BigDecimal("5000"), "none", null, null, null, null)));
    }

    @Test
    void paymentConfirmedFromApplicationOrTransactionStatus() {
        ApplicationDetail paid = application(true, new BigDecimal("5000"), "PAID", null, null, null, null);
        assertTrue(AccountOpeningRules.paymentConfirmed(paid, null));

        ApplicationDetail pending = application(true, new BigDecimal("5000"), "PENDING", null, null, null, null);
        assertFalse(AccountOpeningRules.paymentConfirmed(pending, null));
        assertTrue(AccountOpeningRules.paymentConfirmed(pending, "CAPTURED"));

        var check = AccountOpeningRules.canOpenAccount(pending, "SUCCESS");
        assertTrue(check.allowed());
        assertEquals("Paiement confirmé.", check.reason());
    }

    @Test
    void canOpenAccountRefusedWhenRequiredButNotConfirmed() {
        ApplicationDetail pending = application(true, new BigDecimal("5000"), "PENDING", null, null, null, null);

        var check = AccountOpeningRules.canOpenAccount(pending, "FAILED");
        assertFalse(check.allowed());
        assertEquals("Ouverture impossible : paiement package requis mais non confirmé.", check.reason());
    }

    @Test
    void openingPreconditionAcceptsStatusOrPaymentStatus() {
        assertTrue(AccountOpeningRules.openingPrecondition(
                application(null, null, null, "PAYMENT_CONFIRMED", null, null, null)));
        assertTrue(AccountOpeningRules.openingPrecondition(
                application(null, null, null, "ACCOUNT_OPENED", null, null, null)));
        assertTrue(AccountOpeningRules.openingPrecondition(
                application(null, null, "PAID", "SUBMITTED", null, null, null)));
        assertTrue(AccountOpeningRules.openingPrecondition(
                application(null, null, "NOT_REQUIRED", "SUBMITTED", null, null, null)));
        assertFalse(AccountOpeningRules.openingPrecondition(
                application(null, null, "PENDING", "SUBMITTED", null, null, null)));
    }

    @Test
    void serverLockBeforeOpeningParity() {
        // Aucun paiement attendu : pas de verrou.
        ApplicationDetail free = application(null, null, null, "APPROVED", null, null, null);
        assertFalse(AccountOpeningRules.paymentRequiredBeforeOpening(free));

        // Paiement en attente : requis mais non confirmé.
        ApplicationDetail pending = application(true, new BigDecimal("5000"), "PENDING", "APPROVED", null, null, null);
        assertTrue(AccountOpeningRules.paymentRequiredBeforeOpening(pending));
        assertFalse(AccountOpeningRules.paymentConfirmedBeforeOpening(pending));

        // Paiement confirmé via le statut du dossier.
        ApplicationDetail confirmed = application(true, new BigDecimal("5000"), "PAID", "PAYMENT_CONFIRMED",
                null, null, null);
        assertTrue(AccountOpeningRules.paymentConfirmedBeforeOpening(confirmed));
    }

    @Test
    void packageAmountSumsOpeningAndSubscriptionFees() {
        ApplicationDetail app = application(null, null, null, null,
                new BigDecimal("10000"), new BigDecimal("2500"), new BigDecimal("999"));
        assertEquals(12500.0, AccountOpeningRules.packageAmount(app));
    }

    /** Dossier minimal : seuls les champs utiles aux règles de paiement sont renseignés. */
    private static ApplicationDetail application(Boolean paymentRequired, BigDecimal paymentAmount,
                                                 String packagePaymentStatus, String status,
                                                 BigDecimal openingFee, BigDecimal subscriptionFee,
                                                 BigDecimal monthlyFee) {
        return new ApplicationDetail(
                1L, "DIA-20260711-TEST", "NGUEMA", "Jean", null, null, null, null, null,
                null, null, "+237600000000", "client@test.cm",
                null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null,
                null, null, null,
                openingFee, subscriptionFee, monthlyFee, paymentRequired,
                null, null, null, null,
                status, null, null, null,
                null, null, null, null, null, null,
                null, null,
                null, packagePaymentStatus, null, paymentAmount, null, null);
    }
}
