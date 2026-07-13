package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MastercardReconciliationTest {

    @Test
    void paidWhenAllCriteriaMet() {
        assertTrue(MastercardReconciliation.isPaid(
                "SUCCESS", "CAPTURED", "APPROVED", "XAF", "XAF", 5000.0, 5000.0));
        // Montant capturé supérieur au montant attendu : accepté.
        assertTrue(MastercardReconciliation.isPaid(
                "SUCCESS", "CAPTURED", "APPROVED", "XAF", "XAF", 6000.0, 5000.0));
    }

    @Test
    void notPaidWhenAnyCriterionFails() {
        assertFalse(MastercardReconciliation.isPaid(
                "FAILURE", "CAPTURED", "APPROVED", "XAF", "XAF", 5000.0, 5000.0));
        assertFalse(MastercardReconciliation.isPaid(
                "SUCCESS", "AUTHORIZED", "APPROVED", "XAF", "XAF", 5000.0, 5000.0));
        assertFalse(MastercardReconciliation.isPaid(
                "SUCCESS", "CAPTURED", "DECLINED", "XAF", "XAF", 5000.0, 5000.0));
        // Devise différente.
        assertFalse(MastercardReconciliation.isPaid(
                "SUCCESS", "CAPTURED", "APPROVED", "EUR", "XAF", 5000.0, 5000.0));
        // Montant capturé insuffisant.
        assertFalse(MastercardReconciliation.isPaid(
                "SUCCESS", "CAPTURED", "APPROVED", "XAF", "XAF", 4999.0, 5000.0));
        // Montant attendu nul → jamais confirmé.
        assertFalse(MastercardReconciliation.isPaid(
                "SUCCESS", "CAPTURED", "APPROVED", "XAF", "XAF", 0.0, 0.0));
        // Devise nulle.
        assertFalse(MastercardReconciliation.isPaid(
                "SUCCESS", "CAPTURED", "APPROVED", null, "XAF", 5000.0, 5000.0));
    }

    @Test
    void verificationStatusLabel() {
        assertEquals("PAYMENT_CONFIRMED", MastercardReconciliation.verificationStatus(true));
        assertEquals("PAYMENT_NOT_CONFIRMED", MastercardReconciliation.verificationStatus(false));
    }
}
