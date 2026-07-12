package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ScreeningRulesTest {

    @Test
    void matchStatusesRaiseBlackmoduleAlert() {
        assertEquals("BLACKMODULE_ALERT", ScreeningRules.nextApplicationStatus("MATCH", 90.0, 90.0));
        assertEquals("BLACKMODULE_ALERT", ScreeningRules.nextApplicationStatus("POSSIBLE_MATCH", 90.0, 90.0));
        assertEquals("BLACKMODULE_ALERT", ScreeningRules.nextApplicationStatus("HIGH_RISK", 90.0, 90.0));
    }

    @Test
    void unavailableStatusesGoToComplianceReview() {
        assertEquals("COMPLIANCE_REVIEW", ScreeningRules.nextApplicationStatus("BLACKMODULE_ERROR", 90.0, 90.0));
        assertEquals("COMPLIANCE_REVIEW", ScreeningRules.nextApplicationStatus("BLACKMODULE_UNAVAILABLE", 90.0, 90.0));
    }

    @Test
    void cleanScreeningDependsOnScores() {
        assertEquals("AUTO_KYC_OK", ScreeningRules.nextApplicationStatus("SCREENED", 70.0, 70.0));
        assertEquals("AUTO_KYC_REVIEW", ScreeningRules.nextApplicationStatus("SCREENED", 69.9, 90.0));
        assertEquals("AUTO_KYC_REVIEW", ScreeningRules.nextApplicationStatus("SCREENED", 90.0, 50.0));
        assertEquals("AUTO_KYC_REVIEW", ScreeningRules.nextApplicationStatus("SCREENED", null, null));
    }
}
