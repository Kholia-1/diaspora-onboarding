package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

public record BackofficeUser(
        Long id,
        String username,
        String fullName,
        String passwordHash,
        String role,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastLoginAt) {

    public String roleLabel() {
        return Role.labelFor(role);
    }

    public BackofficeUser withFullName(String newFullName) {
        return new BackofficeUser(id, username, newFullName, passwordHash, role, active, createdAt, lastLoginAt);
    }

    public BackofficeUser withRole(String newRole) {
        return new BackofficeUser(id, username, fullName, passwordHash, newRole, active, createdAt, lastLoginAt);
    }

    public BackofficeUser withActive(boolean newActive) {
        return new BackofficeUser(id, username, fullName, passwordHash, role, newActive, createdAt, lastLoginAt);
    }

    public BackofficeUser withPasswordHash(String newPasswordHash) {
        return new BackofficeUser(id, username, fullName, newPasswordHash, role, active, createdAt, lastLoginAt);
    }

    public BackofficeUser withLastLoginAt(LocalDateTime newLastLoginAt) {
        return new BackofficeUser(id, username, fullName, passwordHash, role, active, createdAt, newLastLoginAt);
    }
}
