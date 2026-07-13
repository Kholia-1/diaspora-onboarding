package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApplicationReferenceGeneratorTest {

    @Test
    void matchesDiaFormatWithTodayDate() {
        String ref = ApplicationReferenceGenerator.generate();
        assertTrue(ref.matches("^DIA-\\d{8}-[0-9A-F]{8}$"), "référence inattendue : " + ref);

        String today = DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDate.now(ZoneOffset.UTC));
        assertTrue(ref.startsWith("DIA-" + today + "-"), "date attendue " + today + " dans " + ref);
    }

    @Test
    void generatesDistinctReferences() {
        assertNotEquals(ApplicationReferenceGenerator.generate(), ApplicationReferenceGenerator.generate());
    }
}
