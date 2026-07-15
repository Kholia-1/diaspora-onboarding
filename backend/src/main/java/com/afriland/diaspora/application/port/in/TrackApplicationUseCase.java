package com.afriland.diaspora.application.port.in;

import com.afriland.diaspora.domain.model.ApplicationStatusView;
import com.afriland.diaspora.domain.model.ApplicationSummary;

import java.time.LocalDateTime;
import java.util.List;

/** Suivi client public (sans session) des dossiers diaspora. */
public interface TrackApplicationUseCase {

    /** Dossiers d'un client par email (400 email invalide, 404 aucun dossier). */
    StatusList statusByEmail(String email);

    /** Dossiers d'un client par email OU téléphone (suffixe 8-9 derniers chiffres). */
    StatusList statusByContact(String identifier);

    /** Statut d'un dossier par référence, email optionnel de contrôle (403 si différent). */
    ApplicationStatusView statusByReference(String reference, String email);

    /** Dossier complet par id numérique (404 si introuvable) — parité GET /api/applications/{id}. */
    ApplicationSummary applicationById(long id);

    /** Informations de compte ouvert côté client, protégées par email. */
    OpenedAccountPublic openedAccountPublic(String applicationReference, String email);

    record StatusList(String identifier, List<ApplicationStatusView> applications) {
    }

    record OpenedAccountPublic(
            String applicationReference,
            String status,
            String clientEmail,
            boolean accountOpened,
            String accountNumber,
            String rib,
            String messageToClient,
            String paymentStatus,
            LocalDateTime openedAt) {
    }
}
