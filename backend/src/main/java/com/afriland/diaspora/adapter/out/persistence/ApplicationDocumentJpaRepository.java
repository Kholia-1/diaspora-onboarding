package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationDocumentJpaRepository extends JpaRepository<ApplicationDocumentEntity, Long> {

    List<ApplicationDocumentEntity> findByApplicationId(Long applicationId);
}
