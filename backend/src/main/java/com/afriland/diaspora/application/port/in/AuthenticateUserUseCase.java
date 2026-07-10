package com.afriland.diaspora.application.port.in;

import com.afriland.diaspora.domain.model.BackofficeUser;

import java.util.Optional;

public interface AuthenticateUserUseCase {

    /**
     * Authentifie un utilisateur back-office. Journalise LOGIN_SUCCESS / LOGIN_FAILED.
     * Met à jour last_login_at.
     *
     * @throws com.afriland.diaspora.application.exception.ApiException 400 si champs vides, 401 si identifiants incorrects.
     */
    BackofficeUser login(String username, String password, String ipAddress, String userAgent);

    /** Journalise le LOGOUT de l'utilisateur (si connu). */
    void logout(String username, String ipAddress, String userAgent);

    /** Utilisateur actif correspondant au principal courant (pour /me). */
    Optional<BackofficeUser> findActiveUser(String username);
}
