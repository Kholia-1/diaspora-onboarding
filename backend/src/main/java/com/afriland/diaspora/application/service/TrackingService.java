package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.TrackApplicationUseCase;
import com.afriland.diaspora.application.port.out.AccountOpeningRecordPort;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.domain.model.AccountOpeningRecord;
import com.afriland.diaspora.domain.model.ApplicationStatusView;
import com.afriland.diaspora.domain.model.ApplicationSummary;
import com.afriland.diaspora.domain.service.PhoneMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class TrackingService implements TrackApplicationUseCase {

    private final ApplicationRepositoryPort applications;
    private final AccountOpeningRecordPort openingRecords;

    public TrackingService(ApplicationRepositoryPort applications, AccountOpeningRecordPort openingRecords) {
        this.applications = applications;
        this.openingRecords = openingRecords;
    }

    @Override
    public StatusList statusByEmail(String email) {
        String emailClean = normalize(email);

        if (emailClean.isEmpty() || !emailClean.contains("@")) {
            throw ApiException.badRequest("Veuillez saisir une adresse email valide.");
        }

        List<ApplicationStatusView> found = applications.findStatusViewsByEmail(emailClean);

        if (found.isEmpty()) {
            throw ApiException.notFound("Aucun dossier trouvé pour cette adresse email.");
        }

        return new StatusList(emailClean, found);
    }

    @Override
    public StatusList statusByContact(String identifier) {
        String value = identifier == null ? "" : identifier.strip();

        if (value.isEmpty()) {
            throw ApiException.badRequest("Veuillez saisir votre email ou votre numéro de téléphone.");
        }

        List<ApplicationStatusView> found;

        if (value.contains("@")) {
            found = applications.findStatusViewsByEmail(value.toLowerCase(Locale.ROOT));
        } else {
            String digits = PhoneMatcher.digitsOnly(value);

            if (digits.length() < 8) {
                throw ApiException.badRequest(
                        "Veuillez saisir un numéro de téléphone valide (au moins 8 chiffres) ou un email.");
            }

            found = applications.findStatusViewsWithPhone().stream()
                    .filter(app -> PhoneMatcher.matches(app.phone(), digits))
                    .toList();
        }

        if (found.isEmpty()) {
            throw ApiException.notFound("Aucun dossier trouvé pour cet email ou ce numéro de téléphone.");
        }

        return new StatusList(value, found);
    }

    @Override
    public ApplicationStatusView statusByReference(String reference, String email) {
        ApplicationStatusView application = applications.findStatusViewByReference(reference)
                .orElseThrow(() -> ApiException.notFound("Aucun dossier trouvé avec cette référence."));

        if (email != null && !email.isEmpty()
                && !lower(application.email()).equals(email.toLowerCase(Locale.ROOT))) {
            throw ApiException.forbidden("L’email ne correspond pas à ce dossier.");
        }

        return application;
    }

    @Override
    public ApplicationSummary applicationById(long id) {
        return applications.findSummaryById(id)
                .orElseThrow(() -> ApiException.notFound("Demande introuvable"));
    }

    @Override
    public OpenedAccountPublic openedAccountPublic(String applicationReference, String email) {
        ApplicationStatusView application = applications.findStatusViewByReference(applicationReference)
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable."));

        if (!normalize(application.email()).equals(normalize(email))) {
            throw ApiException.forbidden("Email non autorisé pour ce dossier.");
        }

        String status = application.status() == null ? ""
                : application.status().toUpperCase(Locale.ROOT);

        AccountOpeningRecord record = openingRecords
                .findByApplicationReference(application.reference()).orElse(null);

        String accountNumber = null;
        String rib = null;
        LocalDateTime openedAt = null;

        if (record != null) {
            accountNumber = record.accountNumber();
            rib = record.rib();
            openedAt = record.createdAt();
        }

        // Fallback : anciennes décisions back-office stockées directement sur le dossier.
        if (isEmpty(accountNumber)) {
            accountNumber = firstNonEmpty(application.accountNumber());
        }
        if (isEmpty(rib)) {
            rib = firstNonEmpty(application.finalRib(), application.rib());
        }

        String messageToClient = firstNonEmpty(application.clientMessage(), application.reviewComment());
        String paymentStatus = firstNonEmpty(application.packagePaymentStatus());

        boolean opened = status.equals("ACCOUNT_OPENED")
                || !isEmpty(accountNumber) || !isEmpty(rib) || record != null;

        if (!opened) {
            throw ApiException.notFound("Le compte n'est pas encore ouvert pour ce dossier.");
        }

        return new OpenedAccountPublic(
                application.reference(),
                status,
                application.email(),
                true,
                accountNumber,
                rib,
                messageToClient,
                paymentStatus,
                openedAt);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.strip().toLowerCase(Locale.ROOT);
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private static boolean isEmpty(String value) {
        return value == null || value.isEmpty();
    }

    /** Parité first_attr : premier attribut non nul et non vide. */
    private static String firstNonEmpty(String... values) {
        for (String value : values) {
            if (!isEmpty(value)) {
                return value;
            }
        }
        return null;
    }
}
