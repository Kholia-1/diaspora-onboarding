package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.AccountOpeningRecordPort;
import com.afriland.diaspora.domain.model.AccountOpeningRecord;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AccountOpeningRecordAdapter implements AccountOpeningRecordPort {

    private final AccountOpeningRecordJpaRepository repository;

    public AccountOpeningRecordAdapter(AccountOpeningRecordJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<AccountOpeningRecord> findByApplicationReference(String applicationReference) {
        return repository.findByApplicationReference(applicationReference)
                .map(AccountOpeningRecordAdapter::toDomain);
    }

    @Override
    public AccountOpeningRecord save(AccountOpeningRecord record) {
        AccountOpeningRecordEntity entity = record.id() != null
                ? repository.findById(record.id()).orElseGet(AccountOpeningRecordEntity::new)
                : new AccountOpeningRecordEntity();

        entity.setApplicationId(record.applicationId());
        entity.setApplicationReference(record.applicationReference());
        entity.setClientEmail(record.clientEmail());
        entity.setAccountNumber(record.accountNumber());
        entity.setRib(record.rib());
        entity.setStatus(record.status());
        entity.setCreatedAt(record.createdAt());
        entity.setRawPayload(record.rawPayload());

        return toDomain(repository.save(entity));
    }

    private static AccountOpeningRecord toDomain(AccountOpeningRecordEntity entity) {
        return new AccountOpeningRecord(
                entity.getId(),
                entity.getApplicationId(),
                entity.getApplicationReference(),
                entity.getClientEmail(),
                entity.getAccountNumber(),
                entity.getRib(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getRawPayload());
    }
}
