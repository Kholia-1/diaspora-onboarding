package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.AgencyRepositoryPort;
import com.afriland.diaspora.domain.model.Agency;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Component
public class AgencyRepositoryAdapter implements AgencyRepositoryPort {

    private final AgencyJpaRepository repository;

    public AgencyRepositoryAdapter(AgencyJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<Agency> search(String q) {
        List<AgencyEntity> entities = (q == null || q.isEmpty())
                ? repository.findAllByOrderByNameAsc()
                : repository.search(likePattern(q));
        return entities.stream().map(AgencyRepositoryAdapter::toDomain).toList();
    }

    @Override
    public List<Agency> searchActive(String q) {
        List<AgencyEntity> entities = (q == null || q.isEmpty())
                ? repository.findByActiveTrueOrderByNameAsc()
                : repository.searchActive(likePattern(q));
        return entities.stream().map(AgencyRepositoryAdapter::toDomain).toList();
    }

    @Override
    public List<Agency> searchByCountry(long countryId) {
        return repository.findByCountryIdOrderByNameAsc(countryId).stream()
                .map(AgencyRepositoryAdapter::toDomain).toList();
    }

    @Override
    public List<Agency> searchActiveByCountry(long countryId) {
        return repository.findByCountryIdAndActiveTrueOrderByNameAsc(countryId).stream()
                .map(AgencyRepositoryAdapter::toDomain).toList();
    }

    @Override
    public Optional<Agency> findById(long id) {
        return repository.findById(id).map(AgencyRepositoryAdapter::toDomain);
    }

    @Override
    public boolean existsByCode(String code) {
        return repository.existsByCode(code);
    }

    @Override
    public boolean existsByName(String name) {
        return repository.existsByName(name);
    }

    @Override
    public Agency save(Agency agency) {
        AgencyEntity entity = agency.id() != null
                ? repository.findById(agency.id()).orElseGet(AgencyEntity::new)
                : new AgencyEntity();

        entity.setCode(agency.code());
        entity.setName(agency.name());
        entity.setCity(agency.city());
        entity.setCountry(agency.country());
        entity.setCountryId(agency.countryId());
        entity.setActive(agency.active());
        entity.setCreatedAt(agency.createdAt());
        entity.setUpdatedAt(agency.updatedAt());

        return toDomain(repository.save(entity));
    }

    static String likePattern(String q) {
        return "%" + q.toLowerCase(Locale.ROOT) + "%";
    }

    private static Agency toDomain(AgencyEntity entity) {
        return new Agency(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getCity(),
                entity.getCountry(),
                entity.getCountryId(),
                Boolean.TRUE.equals(entity.getActive()),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
