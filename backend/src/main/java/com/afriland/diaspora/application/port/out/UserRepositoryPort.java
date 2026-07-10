package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.BackofficeUser;

import java.util.List;
import java.util.Optional;

public interface UserRepositoryPort {

    Optional<BackofficeUser> findByUsername(String username);

    Optional<BackofficeUser> findById(long id);

    List<BackofficeUser> findAllOrderedByUsername();

    /** Nombre d'administrateurs actifs autres que l'utilisateur donné. */
    long countOtherActiveAdmins(long userId);

    BackofficeUser save(BackofficeUser user);
}
