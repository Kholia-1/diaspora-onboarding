package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.AuthenticateUserUseCase;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.PasswordHasherPort;
import com.afriland.diaspora.application.port.out.UserRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthenticationService implements AuthenticateUserUseCase {

    private final UserRepositoryPort users;
    private final PasswordHasherPort passwordHasher;
    private final AuditPort audit;

    public AuthenticationService(UserRepositoryPort users, PasswordHasherPort passwordHasher, AuditPort audit) {
        this.users = users;
        this.passwordHasher = passwordHasher;
        this.audit = audit;
    }

    @Override
    @Transactional
    public com.afriland.diaspora.domain.model.BackofficeUser login(String username, String password,
                                                                   String ipAddress, String userAgent) {
        String cleanUsername = (username == null ? "" : username).strip().toLowerCase(Locale.ROOT);
        String cleanPassword = password == null ? "" : password;

        if (cleanUsername.isEmpty() || cleanPassword.isEmpty()) {
            throw ApiException.badRequest("Identifiant et mot de passe requis.");
        }

        var user = users.findByUsername(cleanUsername).orElse(null);

        if (user == null || !user.active() || !passwordHasher.matches(cleanPassword, user.passwordHash())) {
            audit.log(cleanUsername, "LOGIN_FAILED", "BackofficeUser", null, null, ipAddress, userAgent);
            throw ApiException.unauthorized("Identifiants incorrects.");
        }

        var updated = users.save(user.withLastLoginAt(LocalDateTime.now(ZoneOffset.UTC)));

        audit.log(updated.username(), "LOGIN_SUCCESS", "BackofficeUser",
                String.valueOf(updated.id()), null, ipAddress, userAgent);

        return updated;
    }

    @Override
    @Transactional
    public void logout(String username, String ipAddress, String userAgent) {
        if (username == null || username.isBlank()) {
            return;
        }
        var user = users.findByUsername(username).orElse(null);
        audit.log(username, "LOGOUT", "BackofficeUser",
                user != null ? String.valueOf(user.id()) : null, null, ipAddress, userAgent);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<com.afriland.diaspora.domain.model.BackofficeUser> findActiveUser(String username) {
        if (username == null || username.isBlank()) {
            return Optional.empty();
        }
        return users.findByUsername(username).filter(com.afriland.diaspora.domain.model.BackofficeUser::active);
    }
}
