package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.Country;

import java.util.List;
import java.util.Optional;

public interface CountryRepositoryPort {

    /** Recherche ilike sur iso_code/name_fr/calling_code (q optionnel), tri display_order asc puis name_fr asc. */
    List<Country> search(String q);

    List<Country> searchActive(String q);

    Optional<Country> findById(long id);

    boolean existsByIsoCode(String isoCode);

    Country save(Country country);
}
