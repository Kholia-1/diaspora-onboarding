package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DocumentScoringTest {

    @Test
    void residentThreeBaseGroups() {
        // Résident sans RIB → 3 groupes : identité, revenu, selfie.
        assertEquals(0, DocumentScoring.calculate("RESIDENT", false, Set.of()));
        assertEquals(33, DocumentScoring.calculate("RESIDENT", false, Set.of("IDENTITY_DOCUMENT_RECTO")));
        assertEquals(67, DocumentScoring.calculate("RESIDENT", false,
                Set.of("IDENTITY_DOCUMENT_RECTO", "INCOME_PROOF")));
        assertEquals(100, DocumentScoring.calculate("RESIDENT", false,
                Set.of("IDENTITY_DOCUMENT_RECTO", "INCOME_PROOF", "SELFIE_PHOTO")));
    }

    @Test
    void ribAddsAFourthGroup() {
        // Avec RIB → 4 groupes ; RIB_DOCUMENT présent + identité = 2/4 = 50.
        assertEquals(50, DocumentScoring.calculate("RESIDENT", true,
                Set.of("IDENTITY_DOCUMENT", "RIB_DOCUMENT")));
    }

    @Test
    void nonResidentAddsThreeExtraGroups() {
        // Non-résident sans RIB → 3 + 3 = 6 groupes.
        Set<String> all = Set.of(
                "IDENTITY_DOCUMENT_PHOTO", "INCOME_PROOF", "SELFIE_VIDEO",
                "BIRTH_CERTIFICATE_PHOTO", "EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO",
                "TAX_COMPLIANCE_CERTIFICATE_PHOTO");
        assertEquals(100, DocumentScoring.calculate("NON_RESIDENT", false, all));
        // Seulement 3 groupes de base sur 6 → 50.
        assertEquals(50, DocumentScoring.calculate("NON_RESIDENT", false,
                Set.of("IDENTITY_DOCUMENT_PHOTO", "INCOME_PROOF", "SELFIE_VIDEO")));
    }

    @Test
    void unknownTypesDoNotCount() {
        assertEquals(0, DocumentScoring.calculate("RESIDENT", false, Set.of("RANDOM_TYPE")));
    }
}
