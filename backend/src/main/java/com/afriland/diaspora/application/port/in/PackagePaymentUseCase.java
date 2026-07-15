package com.afriland.diaspora.application.port.in;

import java.util.Map;

/**
 * Paiement package côté client (sans session) — parité app/routers/payments.py.
 * Séparé de {@link GeneratePaymentLinkUseCase} : ici pas de contrôle d'identifiant
 * (le legacy initiate ne protège que par la règle « dossier approuvé »).
 */
public interface PackagePaymentUseCase {

    /**
     * Initie (ou réutilise) le paiement package d'un dossier.
     * Parité POST /api/payments/package/initiate/{application_reference} :
     * 404 dossier introuvable, 403 dossier non approuvé, sinon crée/réutilise la
     * transaction PENDING + session Mastercard et renvoie le payload de paiement.
     */
    Map<String, Object> initiate(String applicationReference);

    /**
     * Statut d'un paiement par sa référence.
     * Parité GET /api/payments/{payment_reference} (404 si introuvable).
     */
    Map<String, Object> getPayment(String paymentReference);
}
