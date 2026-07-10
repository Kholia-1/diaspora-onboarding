package com.afriland.diaspora.application.port.out;

public interface SessionInvalidationPort {

    /** Supprime toutes les sessions ouvertes de l'utilisateur (désactivation / reset de mot de passe). */
    void invalidateSessions(String username);
}
