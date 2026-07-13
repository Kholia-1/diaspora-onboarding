package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.PaymentRepositoryPort;
import com.afriland.diaspora.domain.model.PaymentTransaction;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class PaymentRepositoryAdapter implements PaymentRepositoryPort {

    private static final Set<String> REUSABLE_STATUSES = Set.of("PENDING", "PAID");

    private final PaymentTransactionJpaRepository repository;

    public PaymentRepositoryAdapter(PaymentTransactionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<String> findStatusByPaymentReference(String paymentReference) {
        return repository.findByPaymentReference(paymentReference)
                .map(PaymentTransactionEntity::getStatus);
    }

    @Override
    public Optional<PaymentTransaction> findByPaymentReference(String paymentReference) {
        return repository.findByPaymentReference(paymentReference).map(PaymentRepositoryAdapter::toDomain);
    }

    @Override
    public Optional<PaymentTransaction> findByProviderTransactionId(String providerTransactionId) {
        if (providerTransactionId == null || providerTransactionId.isEmpty()) {
            return Optional.empty();
        }
        return repository.findFirstByProviderTransactionIdOrderByIdDesc(providerTransactionId)
                .map(PaymentRepositoryAdapter::toDomain);
    }

    @Override
    public Optional<PaymentTransaction> findLatestByApplicationReference(String applicationReference) {
        return repository.findFirstByApplicationReferenceOrderByIdDesc(applicationReference)
                .map(PaymentRepositoryAdapter::toDomain);
    }

    @Override
    public Optional<PaymentTransaction> findReusableByApplicationAndPackage(String applicationReference,
                                                                            String packageCode) {
        List<PaymentTransactionEntity> matches =
                repository.findByApplicationReferenceAndPackageCodeOrderByIdDesc(applicationReference, packageCode);
        if (matches.isEmpty()) {
            return Optional.empty();
        }
        PaymentTransactionEntity latest = matches.get(0);
        if (latest.getStatus() != null && REUSABLE_STATUSES.contains(latest.getStatus().toUpperCase())) {
            return Optional.of(toDomain(latest));
        }
        return Optional.empty();
    }

    @Override
    public PaymentTransaction save(PaymentTransaction payment) {
        PaymentTransactionEntity entity = payment.id() != null
                ? repository.findById(payment.id()).orElseGet(PaymentTransactionEntity::new)
                : new PaymentTransactionEntity();

        entity.setPaymentReference(payment.paymentReference());
        entity.setApplicationId(payment.applicationId());
        entity.setApplicationReference(payment.applicationReference());
        entity.setClientEmail(payment.clientEmail());
        entity.setPackageCode(payment.packageCode());
        entity.setPackageName(payment.packageName());
        entity.setAmount(payment.amount());
        entity.setCurrency(payment.currency());
        entity.setProvider(payment.provider());
        entity.setProviderItemCode(payment.providerItemCode());
        entity.setProviderTransactionId(payment.providerTransactionId());
        entity.setStatus(payment.status());
        entity.setPaymentUrl(payment.paymentUrl());
        entity.setCreatedAt(payment.createdAt());
        entity.setPaidAt(payment.paidAt());
        entity.setFailedAt(payment.failedAt());
        entity.setRawResponse(payment.rawResponse());

        return toDomain(repository.save(entity));
    }

    private static PaymentTransaction toDomain(PaymentTransactionEntity e) {
        return new PaymentTransaction(
                e.getId(),
                e.getPaymentReference(),
                e.getApplicationId(),
                e.getApplicationReference(),
                e.getClientEmail(),
                e.getPackageCode(),
                e.getPackageName(),
                e.getAmount(),
                e.getCurrency(),
                e.getProvider(),
                e.getProviderItemCode(),
                e.getProviderTransactionId(),
                e.getStatus(),
                e.getPaymentUrl(),
                e.getCreatedAt(),
                e.getPaidAt(),
                e.getFailedAt(),
                e.getRawResponse());
    }
}
