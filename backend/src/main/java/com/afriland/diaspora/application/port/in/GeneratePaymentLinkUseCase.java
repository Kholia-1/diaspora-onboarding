package com.afriland.diaspora.application.port.in;

import java.util.Map;

public interface GeneratePaymentLinkUseCase {

    /** Génération d'un lien de paiement côté client (protégée par email/téléphone). */
    Map<String, Object> generateForClient(String applicationReference, String identifier, boolean sendWhatsapp);

    /** Génération d'un lien de paiement côté back-office. */
    Map<String, Object> generateForBackoffice(String applicationReference, Double amountOverride,
                                              boolean sendWhatsapp, String actorUsername,
                                              String ipAddress, String userAgent);
}
