package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.Agency;

import java.util.List;
import java.util.Optional;

public interface AgencyRepositoryPort {

    /** Recherche ilike sur name/code/city (q optionnel), tri name asc. */
    List<Agency> search(String q);

    List<Agency> searchActive(String q);

    Optional<Agency> findById(long id);

    boolean existsByCode(String code);

    boolean existsByName(String name);

    Agency save(Agency agency);
}
