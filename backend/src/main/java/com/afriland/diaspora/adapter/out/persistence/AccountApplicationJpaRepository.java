package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountApplicationJpaRepository extends JpaRepository<AccountApplicationEntity, Long> {

    List<AccountApplicationEntity> findAllByOrderByCreatedAtDesc();

    Optional<AccountApplicationEntity> findByReference(String reference);

    List<AccountApplicationEntity> findByEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    List<AccountApplicationEntity> findByPhoneIsNotNullOrderByCreatedAtDesc();

    long countByStatus(String status);
}
