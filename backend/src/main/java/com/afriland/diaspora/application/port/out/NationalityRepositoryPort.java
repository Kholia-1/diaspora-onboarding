package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.Nationality;

import java.util.List;
import java.util.Optional;

public interface NationalityRepositoryPort {

    /** Recherche ilike sur label/code (q optionnel), tri label asc. */
    List<Nationality> search(String q);

    List<Nationality> searchActive(String q);

    Optional<Nationality> findById(long id);

    boolean existsByCode(String code);

    boolean existsByLabel(String label);

    Nationality save(Nationality nationality);
}
