package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.ManageUsersUseCase;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.PasswordHasherPort;
import com.afriland.diaspora.application.port.out.SessionInvalidationPort;
import com.afriland.diaspora.application.port.out.UserRepositoryPort;
import com.afriland.diaspora.domain.model.BackofficeUser;
import com.afriland.diaspora.domain.model.Role;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class UserManagementService implements ManageUsersUseCase {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-z0-9._-]{3,80}$");
    private static final int PASSWORD_MIN_LENGTH = 8;

    private final UserRepositoryPort users;
    private final PasswordHasherPort passwordHasher;
    private final AuditPort audit;
    private final SessionInvalidationPort sessions;

    public UserManagementService(UserRepositoryPort users, PasswordHasherPort passwordHasher,
                                 AuditPort audit, SessionInvalidationPort sessions) {
        this.users = users;
        this.passwordHasher = passwordHasher;
        this.audit = audit;
        this.sessions = sessions;
    }

    @Override
    public List<Role> listRoles() {
        return Role.backofficeRoles();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BackofficeUser> listUsers() {
        return users.findAllOrderedByUsername();
    }

    @Override
    @Transactional
    public BackofficeUser createUser(String actorUsername, String username, String fullName, String role,
                                     String password, String ipAddress, String userAgent) {
        String cleanUsername = (username == null ? "" : username).strip().toLowerCase(Locale.ROOT);
        String cleanFullName = normalizeFullName(fullName);
        String cleanRole = validateRole(role);
        String cleanPassword = validatePassword(password);

        if (!USERNAME_PATTERN.matcher(cleanUsername).matches()) {
            throw ApiException.badRequest(
                    "Identifiant invalide : 3 à 80 caractères (lettres minuscules, chiffres, . _ -).");
        }

        if (users.findByUsername(cleanUsername).isPresent()) {
            throw ApiException.conflict("Cet identifiant existe déjà.");
        }

        var created = users.save(new BackofficeUser(
                null,
                cleanUsername,
                cleanFullName,
                passwordHasher.encode(cleanPassword),
                cleanRole,
                true,
                LocalDateTime.now(ZoneOffset.UTC),
                null));

        audit.log(actorUsername, "BACKOFFICE_USER_CREATED", "BackofficeUser",
                String.valueOf(created.id()),
                "username=" + cleanUsername + ", role=" + cleanRole,
                ipAddress, userAgent);

        return created;
    }

    @Override
    @Transactional
    public BackofficeUser updateUser(String actorUsername, long userId, UpdateUserCommand command,
                                     String ipAddress, String userAgent) {
        var admin = users.findByUsername(actorUsername)
                .orElseThrow(() -> ApiException.unauthorized("Non authentifié."));

        var user = users.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable."));

        List<String> changes = new ArrayList<>();

        if (command.fullNameProvided()) {
            user = user.withFullName(normalizeFullName(command.fullName()));
            changes.add("full_name");
        }

        if (command.roleProvided()) {
            String newRole = validateRole(command.role());

            // On ne retire pas le rôle ADMIN au dernier administrateur actif.
            if ("ADMIN".equals(user.role()) && !"ADMIN".equals(newRole) && user.active()
                    && users.countOtherActiveAdmins(user.id()) == 0) {
                throw ApiException.badRequest("Impossible : ce compte est le dernier administrateur actif.");
            }

            user = user.withRole(newRole);
            changes.add("role=" + newRole);
        }

        if (command.activeProvided()) {
            boolean newActive = command.active();

            if (!newActive) {
                if (user.id().equals(admin.id())) {
                    throw ApiException.badRequest("Vous ne pouvez pas désactiver votre propre compte.");
                }

                if ("ADMIN".equals(user.role()) && users.countOtherActiveAdmins(user.id()) == 0) {
                    throw ApiException.badRequest("Impossible : ce compte est le dernier administrateur actif.");
                }

                // La désactivation ferme les sessions ouvertes de l'utilisateur.
                sessions.invalidateSessions(user.username());
            }

            user = user.withActive(newActive);
            changes.add("active=" + (newActive ? "True" : "False"));
        }

        if (command.passwordProvided()) {
            user = user.withPasswordHash(passwordHasher.encode(validatePassword(command.password())));
            // Le changement de mot de passe invalide les sessions existantes (sauf pour soi-même).
            if (!user.id().equals(admin.id())) {
                sessions.invalidateSessions(user.username());
            }
            changes.add("password");
        }

        if (changes.isEmpty()) {
            throw ApiException.badRequest("Aucune modification fournie.");
        }

        var saved = users.save(user);

        audit.log(admin.username(), "BACKOFFICE_USER_UPDATED", "BackofficeUser",
                String.valueOf(saved.id()),
                "username=" + saved.username() + ", changements : " + String.join(", ", changes),
                ipAddress, userAgent);

        return saved;
    }

    private static String normalizeFullName(String fullName) {
        String clean = fullName == null ? "" : fullName.strip();
        return clean.isEmpty() ? null : clean;
    }

    private static String validateRole(String role) {
        String clean = (role == null ? "" : role).strip().toUpperCase(Locale.ROOT);
        boolean valid = Role.backofficeRoles().stream().anyMatch(r -> r.name().equals(clean));
        if (!valid) {
            String allowed = Role.backofficeRoles().stream().map(Role::name).collect(Collectors.joining(", "));
            throw ApiException.badRequest("Rôle invalide. Rôles autorisés : " + allowed + ".");
        }
        return clean;
    }

    private static String validatePassword(String password) {
        String clean = password == null ? "" : password;
        if (clean.length() < PASSWORD_MIN_LENGTH) {
            throw ApiException.badRequest(
                    "Le mot de passe doit contenir au moins " + PASSWORD_MIN_LENGTH + " caractères.");
        }
        return clean;
    }
}
