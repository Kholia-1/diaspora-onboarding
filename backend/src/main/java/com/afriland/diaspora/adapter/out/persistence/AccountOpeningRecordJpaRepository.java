package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountOpeningRecordJpaRepository extends JpaRepository<AccountOpeningRecordEntity, Long> {

    Optional<AccountOpeningRecordEntity> findByApplicationReference(String applicationReference);
}
