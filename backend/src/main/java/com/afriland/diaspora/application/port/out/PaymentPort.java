package com.afriland.diaspora.application.port.out;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Passerelle de paiement Mastercard Hosted Checkout (MPGS). Fail-safe : jamais
 * d'exception liée à l'indisponibilité/config incomplète — statuts dégradés.
 */
public interface PaymentPort {

    /** Crée une session Hosted Checkout. Retourne un résultat structuré (jamais null). */
    CheckoutSession createCheckoutSession(String orderId, BigDecimal amount, String currency, String description);

    /** Récupère et vérifie une commande (Retrieve Order) — évalue le critère "paid". */
    OrderVerification retrieveOrder(String orderId, String expectedCurrency, double expectedAmount);

    /** Statut public de configuration (parité public_config_status, secrets masqués). */
    Map<String, Object> publicConfigStatus();

    record CheckoutSession(
            boolean success,
            String status,
            String orderId,
            String sessionId,
            String successIndicator,
            String sessionVersion,
            String paymentUrl,
            List<String> missing,
            Map<String, Object> gatewayResponse) {
    }

    record OrderVerification(
            boolean success,
            boolean paid,
            String orderId,
            String result,
            String status,
            String gatewayCode,
            String currency,
            double capturedAmount,
            double authorizedAmount,
            Integer httpStatus,
            Map<String, Object> raw) {
    }
}
