package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.service.DocumentVerificationRules.MatchingRoute;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DocumentVerificationRulesTest {

    @Test
    void shouldOcrMatchesLegacySet() {
        assertTrue(DocumentVerificationRules.shouldOcr("IDENTITY_DOCUMENT_RECTO"));
        assertTrue(DocumentVerificationRules.shouldOcr("RIB_DOCUMENT"));
        assertTrue(DocumentVerificationRules.shouldOcr("INCOME_PROOF"));
        assertFalse(DocumentVerificationRules.shouldOcr("SELFIE_PHOTO"));
        assertFalse(DocumentVerificationRules.shouldOcr(null));
    }

    @Test
    void matchingRouteFollowsDocumentType() {
        assertEquals(MatchingRoute.RIB, DocumentVerificationRules.matchingRoute("RIB_DOCUMENT"));
        assertEquals(MatchingRoute.INCOME, DocumentVerificationRules.matchingRoute("INCOME_PROOF"));
        assertEquals(MatchingRoute.IDENTITY, DocumentVerificationRules.matchingRoute("CNI_VERSO"));
        assertEquals(MatchingRoute.IDENTITY, DocumentVerificationRules.matchingRoute("IDENTITY_DOCUMENT_RECTO"));
    }

    @Test
    void deriveVerificationStatusParity() {
        // Qualité insuffisante prime sur tout.
        assertEquals("QUALITY_REJECTED",
                DocumentVerificationRules.deriveVerificationStatus(true, "MATCH_OK", 95, 44));
        // Bon score + bonne qualité → authentifié.
        assertEquals("AUTHENTICATED",
                DocumentVerificationRules.deriveVerificationStatus(true, "MATCH_OK", 95, 80));
        assertEquals("AUTHENTICATED",
                DocumentVerificationRules.deriveVerificationStatus(true, "PARTIAL_MATCH", 70, 65));
        // Match partiel mais score < 65 → revue.
        assertEquals("REVIEW_REQUIRED",
                DocumentVerificationRules.deriveVerificationStatus(true, "PARTIAL_MATCH", 50, 80));
        // Mismatch / revue OCR → revue.
        assertEquals("REVIEW_REQUIRED",
                DocumentVerificationRules.deriveVerificationStatus(true, "MISMATCH", 0, 80));
        assertEquals("REVIEW_REQUIRED",
                DocumentVerificationRules.deriveVerificationStatus(true, "OCR_REVIEW_REQUIRED", 0, 80));
        // OCR non requis → simple UPLOADED.
        assertEquals("UPLOADED",
                DocumentVerificationRules.deriveVerificationStatus(false, "NOT_REQUIRED", 0, 60));
    }
}
