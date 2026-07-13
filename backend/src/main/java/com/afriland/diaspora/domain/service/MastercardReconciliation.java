package com.afriland.diaspora.domain.service;

/**
 * Critères de confirmation d'un paiement Mastercard Hosted Checkout — parité stricte
 * avec summarize_retrieve_order (app/routers/mastercard_payments_public.py).
 * Un paiement est confirmé (paid=true) si et seulement si TOUS les critères sont réunis.
 */
public final class MastercardReconciliation {

    private MastercardReconciliation() {
    }

    /**
     * @param result          response.result (attendu "SUCCESS")
     * @param status          response.status (attendu "CAPTURED")
     * @param gatewayCode     transaction PAYMENT gatewayCode (attendu "APPROVED")
     * @param currency        response.currency
     * @param expectedCurrency devise attendue (session)
     * @param capturedAmount  response.totalCapturedAmount
     * @param expectedAmount  montant attendu (session), doit être > 0
     */
    public static boolean isPaid(String result, String status, String gatewayCode, String currency,
                                 String expectedCurrency, double capturedAmount, double expectedAmount) {
        return "SUCCESS".equals(result)
                && "CAPTURED".equals(status)
                && "APPROVED".equals(gatewayCode)
                && currency != null && currency.equals(expectedCurrency)
                && capturedAmount >= expectedAmount
                && expectedAmount > 0;
    }

    public static String verificationStatus(boolean paid) {
        return paid ? "PAYMENT_CONFIRMED" : "PAYMENT_NOT_CONFIRMED";
    }
}
