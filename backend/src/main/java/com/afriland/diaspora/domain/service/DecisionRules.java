package com.afriland.diaspora.domain.service;

import java.util.List;
import java.util.Locale;

/**
 * Règles de décision back-office — parité avec POST /api/backoffice/applications/{id}/decision
 * (app/routers/backoffice.py) : décisions autorisées et messages WhatsApp client.
 * Java pur, sans dépendance framework.
 */
public final class DecisionRules {

    /** Parité liste `allowed` du routeur Python (ordre conservé pour le message d'erreur). */
    public static final List<String> ALLOWED_DECISIONS = List.of(
            "APPROVED",
            "REJECTED",
            "NEED_MORE_DOCUMENTS",
            "COMPLIANCE_REVIEW",
            "ACCOUNT_OPENED");

    private DecisionRules() {
    }

    public static boolean isAllowed(String decision) {
        return decision != null && ALLOWED_DECISIONS.contains(decision);
    }

    /** Message d'erreur 400 identique au f-string Python (repr de la liste). */
    public static String invalidDecisionDetail() {
        return "Décision invalide. Valeurs autorisées : ['APPROVED', 'REJECTED', 'NEED_MORE_DOCUMENTS',"
                + " 'COMPLIANCE_REVIEW', 'ACCOUNT_OPENED']";
    }

    /**
     * Message WhatsApp client — parité WHATSAPP_NOTIFY_BACKOFFICE_DECISION_V1.
     * Les valeurs clientMessage/reviewComment/accountNumber/finalRib sont celles
     * du dossier APRÈS application de la décision.
     */
    public static String buildClientMessage(
            String decision,
            String firstName,
            String reference,
            String paymentUrl,
            String clientMessage,
            String reviewComment,
            String accountNumber,
            String finalRib) {

        String decisionUpper = decision == null ? "" : decision.toUpperCase(Locale.ROOT);

        switch (decisionUpper) {
            case "APPROVED":
                if (notEmpty(paymentUrl)) {
                    return "Bonjour " + firstName + ", votre dossier Diaspora "
                            + "référence " + reference + " a été validé. "
                            + "Veuillez finaliser le paiement via ce lien : " + paymentUrl;
                }
                return "Bonjour " + firstName + ", votre dossier Diaspora "
                        + "référence " + reference + " a été validé. "
                        + "Afriland First Bank vous notifiera pour la suite.";

            case "REJECTED": {
                String reason = firstNonEmpty(clientMessage, reviewComment, "Motif non précisé.");
                return "Bonjour " + firstName + ", votre dossier Diaspora "
                        + "référence " + reference + " a été rejeté. "
                        + "Motif : " + reason;
            }

            case "NEED_MORE_DOCUMENTS": {
                String details = firstNonEmpty(clientMessage, reviewComment, "Documents complémentaires requis.");
                return "Bonjour " + firstName + ", votre dossier Diaspora "
                        + "référence " + reference + " nécessite des documents complémentaires. "
                        + "Détails : " + details;
            }

            case "COMPLIANCE_REVIEW":
                return "Bonjour " + firstName + ", votre dossier Diaspora "
                        + "référence " + reference + " est en revue conformité. "
                        + "Vous serez notifié après analyse.";

            case "ACCOUNT_OPENED": {
                StringBuilder message = new StringBuilder(
                        "Bonjour " + firstName + ", votre compte Diaspora a été ouvert avec succès. "
                                + "Référence dossier : " + reference + ".");
                if (notEmpty(accountNumber)) {
                    message.append(" Numéro de compte : ").append(accountNumber).append(".");
                }
                if (notEmpty(finalRib)) {
                    message.append(" RIB : ").append(finalRib).append(".");
                }
                return message.toString();
            }

            default:
                return "Bonjour " + firstName + ", le statut de votre dossier Diaspora "
                        + "référence " + reference + " est maintenant : " + decisionUpper + ".";
        }
    }

    private static boolean notEmpty(String value) {
        return value != null && !value.isEmpty();
    }

    private static String firstNonEmpty(String first, String second, String fallback) {
        if (notEmpty(first)) {
            return first;
        }
        if (notEmpty(second)) {
            return second;
        }
        return fallback;
    }
}
