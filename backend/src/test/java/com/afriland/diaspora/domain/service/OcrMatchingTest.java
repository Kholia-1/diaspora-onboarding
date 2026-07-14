package com.afriland.diaspora.domain.service;

import com.afriland.diaspora.domain.service.OcrMatching.ApplicantIdentity;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OcrMatchingTest {

    // ---- normalize_for_match ----

    @Test
    void normalizeStripsAccentsPunctuationAndCollapsesSpaces() {
        assertEquals("ELODIE N DJAMENA", OcrMatching.normalizeForMatch("Élodie  N'Djaména!"));
        assertEquals("MBARGA NGUELE", OcrMatching.normalizeForMatch("Mbarga-Nguélé"));
        assertEquals("", OcrMatching.normalizeForMatch(null));
        assertEquals("", OcrMatching.normalizeForMatch("   "));
    }

    // ---- difflib ratio (2*M/T) ----

    @Test
    void ratioMatchesDifflibReferenceValues() {
        assertEquals(1.0, OcrMatching.ratio("MARTIN", "MARTIN"), 1e-9);
        assertEquals(1.0, OcrMatching.ratio("", ""), 1e-9);
        assertEquals(0.0, OcrMatching.ratio("abc", ""), 1e-9);
        // "bcd" est le plus long bloc commun : 2*3/(4+4) = 0.75.
        assertEquals(0.75, OcrMatching.ratio("abcd", "bcde"), 1e-9);
    }

    // ---- fuzzy_contains ----

    @Test
    void fuzzyContainsHandlesSubstringAccentsAndThreshold() {
        assertTrue(OcrMatching.fuzzyContains("Martin", "le nomme MARTIN dupont"));
        assertTrue(OcrMatching.fuzzyContains("Ndéngué", "carte NDENGUE"));
        assertFalse(OcrMatching.fuzzyContains("Martin", "zzzz qqqq"));
        assertFalse(OcrMatching.fuzzyContains("", "abc"));
    }

    // ---- match_date_in_ocr ----

    @Test
    void matchDateInOcrAcceptsSeveralFormats() {
        assertTrue(OcrMatching.matchDateInOcr("2000-01-31", "ne le 31 01 2000"));
        assertTrue(OcrMatching.matchDateInOcr("2000-01-31", "20000131 XYZ"));
        assertTrue(OcrMatching.matchDateInOcr("2000-01-31", "date 31/01/2000"));
        assertFalse(OcrMatching.matchDateInOcr("2000-01-31", "aucune date lisible"));
    }

    // ---- match_ocr_with_application ----

    @Test
    void matchOcrWithApplicationScoresNameDocAndDate() {
        ApplicantIdentity identity = new ApplicantIdentity(
                "Dupont", "Martin", null, "1234567", "2000-01-31");
        String ocr = "REPUBLIQUE DU CAMEROUN NOM DUPONT PRENOMS MARTIN No 1234567 NE LE 31 01 2000";

        Map<String, Object> result = OcrMatching.matchOcrWithApplication(ocr, identity);

        assertEquals(95, result.get("match_score"));
        assertEquals("MATCH_OK", result.get("match_status"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> checks = (List<Map<String, Object>>) result.get("checks");
        // last_name, first_name, identity_document_number, birth_date (birth_name absent).
        assertEquals(4, checks.size());
        assertEquals("last_name", checks.get(0).get("field"));
        assertEquals(Boolean.TRUE, checks.get(0).get("matched"));
    }

    @Test
    void matchOcrWithEmptyTextRequiresReview() {
        ApplicantIdentity identity = new ApplicantIdentity(
                "Dupont", "Martin", null, "1234567", "2000-01-31");

        Map<String, Object> result = OcrMatching.matchOcrWithApplication("", identity);

        assertEquals(0, result.get("match_score"));
        assertEquals("OCR_REVIEW_REQUIRED", result.get("match_status"));
    }

    // ---- match_rib_with_application ----

    @Test
    void matchRibExactSubstringScores100() {
        Map<String, Object> result = OcrMatching.matchRibWithApplication(
                "RIB 10005 00023 12345678901 47", "10005 00023 12345678901 47");

        assertEquals(100, result.get("match_score"));
        assertEquals("MATCH_OK", result.get("match_status"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> checks = (List<Map<String, Object>>) result.get("checks");
        assertEquals("MATCH", checks.get(0).get("status"));
    }

    @Test
    void matchRibWithoutExpectedReturnsReviewRequired() {
        Map<String, Object> result = OcrMatching.matchRibWithApplication("compte 123456789", null);

        assertEquals(0, result.get("match_score"));
        assertEquals("OCR_REVIEW_REQUIRED", result.get("match_status"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> checks = (List<Map<String, Object>>) result.get("checks");
        assertEquals("NO_RIB_PROVIDED", checks.get(0).get("status"));
    }

    @Test
    void matchRibUnrelatedNumberIsMismatch() {
        Map<String, Object> result = OcrMatching.matchRibWithApplication(
                "compte 99999999999999", "11111111111111");

        assertEquals(0, result.get("match_score"));
        assertEquals("MISMATCH", result.get("match_status"));
    }

    // ---- match_income_document ----

    @Test
    void matchIncomeDocumentDetectsKeywords() {
        Map<String, Object> result = OcrMatching.matchIncomeDocument(
                "Bulletin de salaire mensuel - net a payer");

        assertEquals(70, result.get("match_score"));
        assertEquals("PARTIAL_MATCH", result.get("match_status"));
    }

    @Test
    void matchIncomeDocumentShortTextScoresZero() {
        Map<String, Object> result = OcrMatching.matchIncomeDocument("hi");

        assertEquals(0, result.get("match_score"));
        assertEquals("OCR_REVIEW_REQUIRED", result.get("match_status"));
    }

    @Test
    void matchIncomeDocumentLongTextWithoutKeywordScores40() {
        Map<String, Object> result = OcrMatching.matchIncomeDocument(
                "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

        assertEquals(40, result.get("match_score"));
        assertEquals("OCR_REVIEW_REQUIRED", result.get("match_status"));
    }
}
