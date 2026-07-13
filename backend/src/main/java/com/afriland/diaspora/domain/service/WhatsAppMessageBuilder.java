package com.afriland.diaspora.domain.service;

import java.util.Locale;
import java.util.Map;

/**
 * Construit le texte des notifications WhatsApp par type d'événement — parité stricte
 * avec build_whatsapp_message (app/services/whatsapp_notification_service.py). Java pur.
 */
public final class WhatsAppMessageBuilder {

    private WhatsAppMessageBuilder() {
    }

    public static String build(String eventType, Map<String, Object> context) {
        Map<String, Object> ctx = context == null ? Map.of() : context;

        String fullName = firstNonEmpty(ctx.get("full_name"), ctx.get("client_name"), "Cher client");
        String reference = firstNonEmpty(ctx.get("reference"), ctx.get("application_reference"), "");
        String paymentUrl = str(ctx.get("payment_url"));
        String packageName = firstNonEmpty(ctx.get("package_name"), null, "votre package");
        String amount = str(ctx.get("amount"));
        String currency = firstNonEmpty(ctx.get("currency"), null, "XAF");
        String accountNumber = str(ctx.get("account_number"));

        String event = eventType == null ? "" : eventType.toUpperCase(Locale.ROOT);

        return switch (event) {
            case "DOSSIER_SOUMIS" -> "Bonjour " + fullName
                    + ", votre dossier d’ouverture de compte diaspora " + reference + " a été soumis avec succès.";
            case "DOSSIER_APPROUVE" -> "Bonjour " + fullName
                    + ", votre dossier " + reference + " a été approuvé par la banque.";
            case "LIEN_PAIEMENT" -> "Bonjour " + fullName + ", votre dossier " + reference
                    + " est approuvé. Veuillez procéder au paiement de " + packageName
                    + " d’un montant de " + amount + " " + currency + " ici : " + paymentUrl;
            case "PAIEMENT_CONFIRME" -> "Bonjour " + fullName
                    + ", le paiement lié à votre dossier " + reference + " a été confirmé.";
            case "COMPTE_OUVERT" -> accountNumber.isEmpty()
                    ? "Bonjour " + fullName + ", votre compte lié au dossier " + reference + " est ouvert."
                    : "Bonjour " + fullName + ", votre compte lié au dossier " + reference
                            + " est ouvert. Numéro de compte : " + accountNumber + ".";
            case "COMPLEMENT_DOCUMENTAIRE" -> "Bonjour " + fullName
                    + ", un complément documentaire est demandé pour votre dossier " + reference
                    + ". Veuillez consulter votre suivi client.";
            default -> "Bonjour " + fullName
                    + ", une mise à jour est disponible pour votre dossier " + reference + ".";
        };
    }

    private static String firstNonEmpty(Object a, Object b, String fallback) {
        String sa = str(a);
        if (!sa.isEmpty()) {
            return sa;
        }
        String sb = str(b);
        if (!sb.isEmpty()) {
            return sb;
        }
        return fallback;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
