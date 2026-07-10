package com.afriland.diaspora.domain.model;

import java.util.List;
import java.util.Optional;

/**
 * Rôles reconnus du back-office (parité BACKOFFICE_ROLES_V1 côté Python).
 * AGENT existe dans le domaine mais ne fait pas partie des rôles back-office attribuables.
 */
public enum Role {
    ADMIN("Administrateur"),
    GFC("GFC"),
    DA("Directeur d'Agence"),
    CONFORMITE("Conformité"),
    AGENT("Agent");

    private final String label;

    Role(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Rôles attribuables dans le back-office — parité avec le dict Python BACKOFFICE_ROLES (sans AGENT). */
    public static List<Role> backofficeRoles() {
        return List.of(ADMIN, GFC, DA, CONFORMITE);
    }

    public static Optional<Role> fromCode(String code) {
        if (code == null) {
            return Optional.empty();
        }
        for (Role role : values()) {
            if (role.name().equals(code)) {
                return Optional.of(role);
            }
        }
        return Optional.empty();
    }

    /** Libellé du rôle, ou le code lui-même si inconnu (parité BACKOFFICE_ROLES.get(role, role)). */
    public static String labelFor(String code) {
        return fromCode(code).map(Role::label).orElse(code);
    }
}
