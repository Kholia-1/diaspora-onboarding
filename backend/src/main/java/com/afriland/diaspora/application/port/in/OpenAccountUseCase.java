package com.afriland.diaspora.application.port.in;

import java.time.LocalDateTime;
import java.util.Map;

public interface OpenAccountUseCase {

    /**
     * Ouverture de compte après paiement confirmé (ou non requis). Le numéro de
     * compte et le RIB sont SAISIS par le back-office (aucune génération automatique,
     * parité avec app/routers/account_opening.py).
     */
    OpenAccountResult openAccount(String actorUsername, String applicationReference,
                                  OpenAccountCommand command, String ipAddress, String userAgent);

    /** Informations du compte ouvert pour un dossier (404 si aucun enregistrement). */
    OpenedAccountView getOpenedAccount(String applicationReference);

    record OpenAccountCommand(String accountNumber, String rib, String openedBy, String comment) {
    }

    record OpenedAccountView(
            String applicationReference,
            String clientEmail,
            String accountNumber,
            String rib,
            String status,
            LocalDateTime createdAt) {
    }

    record OpenAccountResult(
            String message,
            String applicationStatus,
            OpenedAccountView account,
            Map<String, Object> whatsappNotification) {
    }
}
