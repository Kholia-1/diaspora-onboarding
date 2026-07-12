package com.afriland.diaspora.application.port.out;

import java.util.Optional;

public interface PaymentRepositoryPort {

    /** Statut de la transaction de paiement liée à une référence de paiement package. */
    Optional<String> findStatusByPaymentReference(String paymentReference);
}
