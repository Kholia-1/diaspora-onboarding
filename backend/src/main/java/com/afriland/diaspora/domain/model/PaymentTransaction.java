package com.afriland.diaspora.domain.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Transaction de paiement package (table payment_transactions). Modèle métier pur. */
public record PaymentTransaction(
        Long id,
        String paymentReference,
        Long applicationId,
        String applicationReference,
        String clientEmail,
        String packageCode,
        String packageName,
        BigDecimal amount,
        String currency,
        String provider,
        String providerItemCode,
        String providerTransactionId,
        String status,
        String paymentUrl,
        LocalDateTime createdAt,
        LocalDateTime paidAt,
        LocalDateTime failedAt,
        String rawResponse) {

    public PaymentTransaction withProviderSession(String providerTransactionId, String paymentUrl,
                                                  String rawResponse) {
        return new PaymentTransaction(id, paymentReference, applicationId, applicationReference, clientEmail,
                packageCode, packageName, amount, currency, provider, providerItemCode,
                providerTransactionId, status, paymentUrl, createdAt, paidAt, failedAt, rawResponse);
    }

    public PaymentTransaction markPaid(LocalDateTime paidAt, String providerTransactionId, String rawResponse) {
        return new PaymentTransaction(id, paymentReference, applicationId, applicationReference, clientEmail,
                packageCode, packageName, amount, currency, provider, providerItemCode,
                providerTransactionId != null ? providerTransactionId : this.providerTransactionId,
                "PAID", paymentUrl, createdAt, paidAt != null ? paidAt : this.paidAt, failedAt, rawResponse);
    }
}
