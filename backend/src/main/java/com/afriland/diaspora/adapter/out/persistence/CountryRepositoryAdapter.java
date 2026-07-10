package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.CountryRepositoryPort;
import com.afriland.diaspora.domain.model.Country;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class CountryRepositoryAdapter implements CountryRepositoryPort {

    private final CountryJpaRepository repository;

    public CountryRepositoryAdapter(CountryJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<Country> search(String q) {
        List<CountryEntity> entities = (q == null || q.isEmpty())
                ? repository.findAllByOrderByDisplayOrderAscNameFrAsc()
                : repository.search(AgencyRepositoryAdapter.likePattern(q));
        return entities.stream().map(CountryRepositoryAdapter::toDomain).toList();
    }

    @Override
    public List<Country> searchActive(String q) {
        List<CountryEntity> entities = (q == null || q.isEmpty())
                ? repository.findByActiveTrueOrderByDisplayOrderAscNameFrAsc()
                : repository.searchActive(AgencyRepositoryAdapter.likePattern(q));
        return entities.stream().map(CountryRepositoryAdapter::toDomain).toList();
    }

    @Override
    public Optional<Country> findById(long id) {
        return repository.findById(id).map(CountryRepositoryAdapter::toDomain);
    }

    @Override
    public boolean existsByIsoCode(String isoCode) {
        return repository.existsByIsoCode(isoCode);
    }

    @Override
    public Country save(Country country) {
        CountryEntity entity = country.id() != null
                ? repository.findById(country.id()).orElseGet(CountryEntity::new)
                : new CountryEntity();

        entity.setIsoCode(country.isoCode());
        entity.setFlag(country.flag());
        entity.setNameFr(country.nameFr());
        entity.setCallingCode(country.callingCode());
        entity.setActive(country.active());
        entity.setDisplayOrder(country.displayOrder());
        entity.setCreatedAt(country.createdAt());
        entity.setUpdatedAt(country.updatedAt());

        return toDomain(repository.save(entity));
    }

    private static Country toDomain(CountryEntity entity) {
        return new Country(
                entity.getId(),
                entity.getIsoCode(),
                entity.getFlag(),
                entity.getNameFr(),
                entity.getCallingCode(),
                Boolean.TRUE.equals(entity.getActive()),
                entity.getDisplayOrder(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
