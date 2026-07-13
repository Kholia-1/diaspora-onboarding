package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.model.ApplicationDetail;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PackagePaymentRulesTest {

    @Test
    void amountSumsOpeningAndSubscriptionFees() {
        ApplicationDetail app = application(null, new BigDecimal("10000"), new BigDecimal("2500"),
                new BigDecimal("999"));
        // Frais mensuels non encaissés : exclus du montant.
        assertEquals(12500.0, PackagePaymentRules.calculateAmount(app));
    }

    @Test
    void paymentRequiredWhenFlagOrPositiveAmount() {
        assertTrue(PackagePaymentRules.isPaymentRequired(
                application(true, null, null, null)));
        assertTrue(PackagePaymentRules.isPaymentRequired(
                application(null, new BigDecimal("5000"), null, null)));
        assertFalse(PackagePaymentRules.isPaymentRequired(
                application(null, null, null, new BigDecimal("999"))));
        assertFalse(PackagePaymentRules.isPaymentRequired(
                application(false, BigDecimal.ZERO, BigDecimal.ZERO, null)));
    }

    @Test
    void paymentReferenceFormat() {
        String ref = PackagePaymentRules.buildPaymentReference();
        assertTrue(ref.matches("^PAY-[0-9A-F]{12}$"), "référence inattendue : " + ref);
    }

    private static ApplicationDetail application(Boolean paymentRequired, BigDecimal openingFee,
                                                 BigDecimal subscriptionFee, BigDecimal monthlyFee) {
        return new ApplicationDetail(
                1L, "DIA-20260713-TEST", "NGUEMA", "Jean", null, null, null, null, null,
                null, null, "+237600000000", "client@test.cm",
                null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null,
                null, null, null,
                openingFee, subscriptionFee, monthlyFee, paymentRequired,
                null, null, null, null,
                "APPROVED", null, null, null,
                null, null, null, null, null, null,
                null, null,
                null, null, null, null, null, null);
    }
}
