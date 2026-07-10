package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

public record Country(
        Long id,
        String isoCode,
        String flag,
        String nameFr,
        String callingCode,
        boolean active,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
