package com.afriland.diaspora.domain.service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/** Génère une référence dossier — parité generate_reference : "DIA-" + YYYYMMDD + "-" + 8 hex majuscules. */
public final class ApplicationReferenceGenerator {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");

    private ApplicationReferenceGenerator() {
    }

    public static String generate() {
        String day = DAY.format(LocalDate.now(ZoneOffset.UTC));
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "DIA-" + day + "-" + suffix;
    }
}
