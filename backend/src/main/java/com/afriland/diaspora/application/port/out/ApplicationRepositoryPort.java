package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.ApplicationSummary;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepositoryPort {

    /** Tous les dossiers, tri created_at desc. */
    List<ApplicationSummary> findAllSummaries();

    Optional<ApplicationDetail> findById(long id);

    Optional<ApplicationDetail> findByReference(String reference);
}
