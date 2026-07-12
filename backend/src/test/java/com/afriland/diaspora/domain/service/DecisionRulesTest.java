package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DecisionRulesTest {

    @Test
    void onlyExactDecisionsAreAllowed() {
        assertTrue(DecisionRules.isAllowed("APPROVED"));
        assertTrue(DecisionRules.isAllowed("REJECTED"));
        assertTrue(DecisionRules.isAllowed("NEED_MORE_DOCUMENTS"));
        assertTrue(DecisionRules.isAllowed("COMPLIANCE_REVIEW"));
        assertTrue(DecisionRules.isAllowed("ACCOUNT_OPENED"));

        assertFalse(DecisionRules.isAllowed("approved")); // sensible à la casse, comme le Python
        assertFalse(DecisionRules.isAllowed(null));
        assertFalse(DecisionRules.isAllowed("CANCELLED"));
    }

    @Test
    void approvedMessageUsesPaymentUrlWhenPresent() {
        String withUrl = DecisionRules.buildClientMessage("APPROVED", "Jean", "DIA-1",
                "https://pay.example/x", null, null, null, null);
        assertEquals("Bonjour Jean, votre dossier Diaspora référence DIA-1 a été validé. "
                + "Veuillez finaliser le paiement via ce lien : https://pay.example/x", withUrl);

        String withoutUrl = DecisionRules.buildClientMessage("APPROVED", "Jean", "DIA-1",
                null, null, null, null, null);
        assertEquals("Bonjour Jean, votre dossier Diaspora référence DIA-1 a été validé. "
                + "Afriland First Bank vous notifiera pour la suite.", withoutUrl);
    }

    @Test
    void rejectedMessageFallsBackToCommentThenDefault() {
        assertEquals("Bonjour Jean, votre dossier Diaspora référence DIA-1 a été rejeté. Motif : incomplet",
                DecisionRules.buildClientMessage("REJECTED", "Jean", "DIA-1", null, null, "incomplet", null, null));

        assertEquals("Bonjour Jean, votre dossier Diaspora référence DIA-1 a été rejeté. Motif : Motif non précisé.",
                DecisionRules.buildClientMessage("REJECTED", "Jean", "DIA-1", null, null, null, null, null));

        // client_message prioritaire sur review_comment.
        assertEquals("Bonjour Jean, votre dossier Diaspora référence DIA-1 a été rejeté. Motif : msg client",
                DecisionRules.buildClientMessage("REJECTED", "Jean", "DIA-1", null, "msg client", "interne", null, null));
    }

    @Test
    void accountOpenedMessageAppendsAccountAndRib() {
        String full = DecisionRules.buildClientMessage("ACCOUNT_OPENED", "Jean", "DIA-1",
                null, null, null, "10005-00001-123", "CM21-10005");
        assertEquals("Bonjour Jean, votre compte Diaspora a été ouvert avec succès. "
                + "Référence dossier : DIA-1. Numéro de compte : 10005-00001-123. RIB : CM21-10005.", full);

        String bare = DecisionRules.buildClientMessage("ACCOUNT_OPENED", "Jean", "DIA-1",
                null, null, null, null, null);
        assertEquals("Bonjour Jean, votre compte Diaspora a été ouvert avec succès. "
                + "Référence dossier : DIA-1.", bare);
    }

    @Test
    void unknownDecisionProducesGenericStatusMessage() {
        assertEquals("Bonjour Jean, le statut de votre dossier Diaspora référence DIA-1 "
                        + "est maintenant : ESCALATED.",
                DecisionRules.buildClientMessage("ESCALATED", "Jean", "DIA-1", null, null, null, null, null));
    }
}
