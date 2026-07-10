package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.UserRepositoryPort;
import com.afriland.diaspora.domain.model.BackofficeUser;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class UserRepositoryAdapter implements UserRepositoryPort {

    private final BackofficeUserJpaRepository repository;

    public UserRepositoryAdapter(BackofficeUserJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<BackofficeUser> findByUsername(String username) {
        return repository.findByUsername(username).map(UserRepositoryAdapter::toDomain);
    }

    @Override
    public Optional<BackofficeUser> findById(long id) {
        return repository.findById(id).map(UserRepositoryAdapter::toDomain);
    }

    @Override
    public List<BackofficeUser> findAllOrderedByUsername() {
        return repository.findAllByOrderByUsernameAsc().stream().map(UserRepositoryAdapter::toDomain).toList();
    }

    @Override
    public long countOtherActiveAdmins(long userId) {
        return repository.countByRoleAndActiveTrueAndIdNot("ADMIN", userId);
    }

    @Override
    public BackofficeUser save(BackofficeUser user) {
        BackofficeUserEntity entity = user.id() != null
                ? repository.findById(user.id()).orElseGet(BackofficeUserEntity::new)
                : new BackofficeUserEntity();

        entity.setUsername(user.username());
        entity.setFullName(user.fullName());
        entity.setPasswordHash(user.passwordHash());
        entity.setRole(user.role());
        entity.setActive(user.active());
        entity.setCreatedAt(user.createdAt());
        entity.setLastLoginAt(user.lastLoginAt());

        return toDomain(repository.save(entity));
    }

    private static BackofficeUser toDomain(BackofficeUserEntity entity) {
        return new BackofficeUser(
                entity.getId(),
                entity.getUsername(),
                entity.getFullName(),
                entity.getPasswordHash(),
                entity.getRole(),
                Boolean.TRUE.equals(entity.getActive()),
                entity.getCreatedAt(),
                entity.getLastLoginAt());
    }
}
