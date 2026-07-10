package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

public record Agency(
        Long id,
        String code,
        String name,
        String city,
        String country,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
