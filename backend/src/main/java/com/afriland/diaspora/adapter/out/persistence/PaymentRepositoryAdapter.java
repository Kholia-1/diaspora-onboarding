package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.PaymentRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PaymentRepositoryAdapter implements PaymentRepositoryPort {

    private final PaymentTransactionJpaRepository repository;

    public PaymentRepositoryAdapter(PaymentTransactionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<String> findStatusByPaymentReference(String paymentReference) {
        return repository.findByPaymentReference(paymentReference)
                .map(PaymentTransactionEntity::getStatus);
    }
}
