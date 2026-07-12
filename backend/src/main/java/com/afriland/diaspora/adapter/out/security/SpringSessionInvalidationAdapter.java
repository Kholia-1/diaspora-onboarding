package com.afriland.diaspora.adapter.out.security;

import com.afriland.diaspora.application.port.out.SessionInvalidationPort;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * Supprime les sessions Spring Session (JDBC) d'un utilisateur, retrouvées par
 * l'index PRINCIPAL_NAME (alimenté automatiquement quand le SecurityContext est en session).
 */
@Component
public class SpringSessionInvalidationAdapter implements SessionInvalidationPort {

    private final ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> sessionRepository;

    public SpringSessionInvalidationAdapter(
            ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Override
    public void invalidateSessions(String username) {
        FindByIndexNameSessionRepository<? extends Session> repository = sessionRepository.getIfAvailable();
        if (repository == null || username == null) {
            return;
        }
        repository.findByPrincipalName(username).keySet().forEach(repository::deleteById);
    }
}
