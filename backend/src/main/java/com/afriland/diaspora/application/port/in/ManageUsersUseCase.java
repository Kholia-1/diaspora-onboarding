package com.afriland.diaspora.application.port.in;

import com.afriland.diaspora.domain.model.BackofficeUser;
import com.afriland.diaspora.domain.model.Role;

import java.util.List;

public interface ManageUsersUseCase {

    /** Rôles attribuables (sans AGENT), dans l'ordre du dict Python. */
    List<Role> listRoles();

    /** Tous les utilisateurs, tri username asc. */
    List<BackofficeUser> listUsers();

    BackofficeUser createUser(String actorUsername, String username, String fullName, String role,
                              String password, String ipAddress, String userAgent);

    BackofficeUser updateUser(String actorUsername, long userId, UpdateUserCommand command,
                              String ipAddress, String userAgent);

    /**
     * Commande PATCH : chaque champ porte un indicateur "présent dans le payload"
     * pour distinguer absence et valeur nulle (parité avec `"champ" in payload`).
     */
    record UpdateUserCommand(
            boolean fullNameProvided, String fullName,
            boolean roleProvided, String role,
            boolean activeProvided, boolean active,
            boolean passwordProvided, String password) {
    }
}
