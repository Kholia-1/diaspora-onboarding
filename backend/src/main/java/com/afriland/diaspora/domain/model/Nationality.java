package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

public record Nationality(
        Long id,
        String code,
        String label,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
