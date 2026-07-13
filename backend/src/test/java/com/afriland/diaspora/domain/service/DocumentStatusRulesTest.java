package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DocumentStatusRulesTest {

    @Test
    void highScoresPromoteToAutoKycOk() {
        assertEquals("AUTO_KYC_OK", DocumentStatusRules.nextStatus(70, 70, "SUBMITTED"));
        assertEquals("AUTO_KYC_OK", DocumentStatusRules.nextStatus(85, 90, "AUTO_KYC_REVIEW"));
    }

    @Test
    void highScoresDoNotOverrideOtherStatuses() {
        assertEquals("COMPLIANCE_REVIEW", DocumentStatusRules.nextStatus(90, 90, "COMPLIANCE_REVIEW"));
        assertEquals("ACCOUNT_OPENED", DocumentStatusRules.nextStatus(90, 90, "ACCOUNT_OPENED"));
    }

    @Test
    void lowScoresMoveSubmittedToReview() {
        assertEquals("AUTO_KYC_REVIEW", DocumentStatusRules.nextStatus(65, 90, "SUBMITTED"));
        assertEquals("AUTO_KYC_REVIEW", DocumentStatusRules.nextStatus(90, 65, "SUBMITTED"));
    }

    @Test
    void lowScoresLeaveNonSubmittedUnchanged() {
        assertEquals("AUTO_KYC_REVIEW", DocumentStatusRules.nextStatus(50, 50, "AUTO_KYC_REVIEW"));
        assertEquals("BLACKMODULE_ALERT", DocumentStatusRules.nextStatus(50, 50, "BLACKMODULE_ALERT"));
    }
}
