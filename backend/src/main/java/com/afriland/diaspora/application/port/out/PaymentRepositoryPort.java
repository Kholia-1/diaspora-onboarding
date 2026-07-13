package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.PaymentTransaction;

import java.util.Optional;

public interface PaymentRepositoryPort {

    /** Statut de la transaction liée à une référence de paiement package (usage Phase 2/3). */
    Optional<String> findStatusByPaymentReference(String paymentReference);

    Optional<PaymentTransaction> findByPaymentReference(String paymentReference);

    Optional<PaymentTransaction> findByProviderTransactionId(String providerTransactionId);

    /** Dernière transaction (id desc) pour une référence de dossier. */
    Optional<PaymentTransaction> findLatestByApplicationReference(String applicationReference);

    /**
     * Dernière transaction PENDING/PAID pour un dossier et un code package
     * (parité find_existing_payment).
     */
    Optional<PaymentTransaction> findReusableByApplicationAndPackage(String applicationReference, String packageCode);

    PaymentTransaction save(PaymentTransaction payment);
}
