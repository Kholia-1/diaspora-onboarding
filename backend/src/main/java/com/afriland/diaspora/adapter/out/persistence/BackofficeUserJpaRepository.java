package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BackofficeUserJpaRepository extends JpaRepository<BackofficeUserEntity, Long> {

    Optional<BackofficeUserEntity> findByUsername(String username);

    List<BackofficeUserEntity> findAllByOrderByUsernameAsc();

    long countByRoleAndActiveTrueAndIdNot(String role, Long id);
}
