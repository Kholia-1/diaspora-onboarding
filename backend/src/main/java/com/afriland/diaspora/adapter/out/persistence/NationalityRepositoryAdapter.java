package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.NationalityRepositoryPort;
import com.afriland.diaspora.domain.model.Nationality;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class NationalityRepositoryAdapter implements NationalityRepositoryPort {

    private final NationalityJpaRepository repository;

    public NationalityRepositoryAdapter(NationalityJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<Nationality> search(String q) {
        List<NationalityEntity> entities = (q == null || q.isEmpty())
                ? repository.findAllByOrderByLabelAsc()
                : repository.search(AgencyRepositoryAdapter.likePattern(q));
        return entities.stream().map(NationalityRepositoryAdapter::toDomain).toList();
    }

    @Override
    public List<Nationality> searchActive(String q) {
        List<NationalityEntity> entities = (q == null || q.isEmpty())
                ? repository.findByActiveTrueOrderByLabelAsc()
                : repository.searchActive(AgencyRepositoryAdapter.likePattern(q));
        return entities.stream().map(NationalityRepositoryAdapter::toDomain).toList();
    }

    @Override
    public Optional<Nationality> findById(long id) {
        return repository.findById(id).map(NationalityRepositoryAdapter::toDomain);
    }

    @Override
    public boolean existsByCode(String code) {
        return repository.existsByCode(code);
    }

    @Override
    public boolean existsByLabel(String label) {
        return repository.existsByLabel(label);
    }

    @Override
    public Nationality save(Nationality nationality) {
        NationalityEntity entity = nationality.id() != null
                ? repository.findById(nationality.id()).orElseGet(NationalityEntity::new)
                : new NationalityEntity();

        entity.setCode(nationality.code());
        entity.setLabel(nationality.label());
        entity.setActive(nationality.active());
        entity.setCreatedAt(nationality.createdAt());
        entity.setUpdatedAt(nationality.updatedAt());

        return toDomain(repository.save(entity));
    }

    private static Nationality toDomain(NationalityEntity entity) {
        return new Nationality(
                entity.getId(),
                entity.getCode(),
                entity.getLabel(),
                Boolean.TRUE.equals(entity.getActive()),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
