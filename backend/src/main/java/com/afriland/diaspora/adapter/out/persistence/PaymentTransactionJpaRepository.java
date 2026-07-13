package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentTransactionJpaRepository extends JpaRepository<PaymentTransactionEntity, Long> {

    Optional<PaymentTransactionEntity> findByPaymentReference(String paymentReference);

    Optional<PaymentTransactionEntity> findFirstByProviderTransactionIdOrderByIdDesc(String providerTransactionId);

    Optional<PaymentTransactionEntity> findFirstByApplicationReferenceOrderByIdDesc(String applicationReference);

    List<PaymentTransactionEntity> findByApplicationReferenceAndPackageCodeOrderByIdDesc(
            String applicationReference, String packageCode);
}
