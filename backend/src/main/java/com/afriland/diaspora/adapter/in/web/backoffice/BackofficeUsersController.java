package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.adapter.in.web.HttpRequestMeta;
import com.afriland.diaspora.application.port.in.ManageUsersUseCase;
import com.afriland.diaspora.application.port.in.ManageUsersUseCase.UpdateUserCommand;
import com.afriland.diaspora.domain.model.BackofficeUser;
import com.afriland.diaspora.domain.model.Role;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backoffice/users")
public class BackofficeUsersController {

    private final ManageUsersUseCase users;

    public BackofficeUsersController(ManageUsersUseCase users) {
        this.users = users;
    }

    @GetMapping("/roles")
    public RolesResponse listRoles() {
        List<RolePayload> roles = users.listRoles().stream()
                .map(role -> new RolePayload(role.name(), role.label()))
                .toList();
        return new RolesResponse(roles);
    }

    @GetMapping
    public UsersResponse listUsers() {
        List<UserPayload> payloads = users.listUsers().stream().map(UserPayload::from).toList();
        return new UsersResponse(payloads.size(), payloads);
    }

    @PostMapping
    public UserResponse createUser(@RequestBody Map<String, Object> payload,
                                   Authentication authentication, HttpServletRequest request) {
        BackofficeUser created = users.createUser(
                authentication.getName(),
                stringOrNull(payload.get("username")),
                stringOrNull(payload.get("full_name")),
                stringOrNull(payload.get("role")),
                stringOrNull(payload.get("password")),
                HttpRequestMeta.clientIp(request),
                HttpRequestMeta.userAgent(request));

        return new UserResponse(true, UserPayload.from(created));
    }

    @PatchMapping("/{userId}")
    public UserResponse updateUser(@PathVariable long userId,
                                   @RequestBody Map<String, Object> payload,
                                   Authentication authentication, HttpServletRequest request) {
        UpdateUserCommand command = new UpdateUserCommand(
                payload.containsKey("full_name"), stringOrNull(payload.get("full_name")),
                payload.containsKey("role"), stringOrNull(payload.get("role")),
                payload.containsKey("active"), truthy(payload.get("active")),
                payload.containsKey("password"), stringOrNull(payload.get("password")));

        BackofficeUser updated = users.updateUser(
                authentication.getName(), userId, command,
                HttpRequestMeta.clientIp(request), HttpRequestMeta.userAgent(request));

        return new UserResponse(true, UserPayload.from(updated));
    }

    private static String stringOrNull(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    /** Parité bool(...) Python : null/false/0/"" sont faux, le reste est vrai. */
    private static boolean truthy(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.doubleValue() != 0;
        }
        if (value instanceof String s) {
            return !s.isEmpty();
        }
        return true;
    }

    public record RolesResponse(List<RolePayload> roles) {
    }

    public record RolePayload(String code, String label) {
    }

    public record UsersResponse(int count, List<UserPayload> users) {
    }

    public record UserResponse(boolean ok, UserPayload user) {
    }

    public record UserPayload(
            long id,
            String username,
            String fullName,
            String role,
            String roleLabel,
            boolean active,
            LocalDateTime createdAt,
            LocalDateTime lastLoginAt) {

        static UserPayload from(BackofficeUser user) {
            return new UserPayload(
                    user.id(),
                    user.username(),
                    user.fullName(),
                    user.role(),
                    Role.labelFor(user.role()),
                    user.active(),
                    user.createdAt(),
                    user.lastLoginAt());
        }
    }
}
