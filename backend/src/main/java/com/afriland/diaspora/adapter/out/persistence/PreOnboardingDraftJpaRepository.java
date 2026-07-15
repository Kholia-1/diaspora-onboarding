package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PreOnboardingDraftJpaRepository extends JpaRepository<PreOnboardingDraftEntity, Long> {

    Optional<PreOnboardingDraftEntity> findByDraftId(String draftId);

    List<PreOnboardingDraftEntity> findTop5ByStatusAndEmailIgnoreCaseOrderByUpdatedAtDesc(String status, String email);

    @Query("SELECT d FROM PreOnboardingDraftEntity d WHERE d.status = :status AND d.phone LIKE %:suffix ORDER BY d.updatedAt DESC")
    List<PreOnboardingDraftEntity> findByStatusAndPhoneEndingWith(@Param("status") String status,
                                                                  @Param("suffix") String suffix);
}
