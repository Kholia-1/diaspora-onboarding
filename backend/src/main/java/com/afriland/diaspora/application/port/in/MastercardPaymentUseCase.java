package com.afriland.diaspora.application.port.in;

import java.util.Map;

public interface MastercardPaymentUseCase {

    /** Crée une session Hosted Checkout (endpoint de test/générique). */
    Map<String, Object> createCheckoutSession(Map<String, Object> payload);

    /** Healthcheck GET du webhook. */
    Map<String, Object> webhookHealthcheck();

    /** Réception POST du webhook Mastercard → tentative de réconciliation best-effort. */
    Map<String, Object> handleWebhook(Map<String, Object> body);

    /** Résumé sécurisé du dernier paiement correspondant aux filtres. */
    Map<String, Object> latestRecord(String orderId, String resultIndicator, String sessionId,
                                     String dossierId, String clientReference);

    /** Résumé de paiement package d'un dossier (back-office). */
    Map<String, Object> applicationPaymentSummary(String applicationReference);

    /** Statut public de configuration Mastercard. */
    Map<String, Object> configStatus();

    /** Configuration opérationnelle (GET). */
    Map<String, Object> operationalConfig();

    /** Enregistrement de la configuration opérationnelle (POST). */
    Map<String, Object> saveOperationalConfig(Map<String, Object> payload);
}
