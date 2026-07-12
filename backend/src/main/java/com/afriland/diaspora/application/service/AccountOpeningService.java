package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.OpenAccountUseCase;
import com.afriland.diaspora.application.port.out.AccountOpeningRecordPort;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.NotificationPort;
import com.afriland.diaspora.application.port.out.PaymentRepositoryPort;
import com.afriland.diaspora.domain.model.AccountOpeningRecord;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.service.AccountOpeningRules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AccountOpeningService implements OpenAccountUseCase {

    private final ApplicationRepositoryPort applications;
    private final AccountOpeningRecordPort records;
    private final PaymentRepositoryPort payments;
    private final NotificationPort notifications;
    private final AuditPort audit;

    public AccountOpeningService(ApplicationRepositoryPort applications, AccountOpeningRecordPort records,
                                 PaymentRepositoryPort payments, NotificationPort notifications, AuditPort audit) {
        this.applications = applications;
        this.records = records;
        this.payments = payments;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Override
    @Transactional
    public OpenAccountResult openAccount(String actorUsername, String applicationReference,
                                         OpenAccountCommand command, String ipAddress, String userAgent) {
        ApplicationDetail application = applications.findByReference(applicationReference)
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable."));

        if (!AccountOpeningRules.openingPrecondition(application)) {
            throw ApiException.forbidden(
                    "Le compte ne peut être ouvert qu'après confirmation du paiement ou si aucun paiement n'est requis.");
        }

        String accountNumber = strip(command.accountNumber());
        String rib = strip(command.rib());
        String openedBy = strip(command.openedBy());
        if (openedBy.isEmpty()) {
            openedBy = "BACKOFFICE";
        }
        String comment = strip(command.comment());

        if (accountNumber.isEmpty()) {
            throw ApiException.badRequest("Le numéro de compte est obligatoire.");
        }
        if (rib.isEmpty()) {
            throw ApiException.badRequest("Le RIB saisi par le back-office est obligatoire.");
        }

        AccountOpeningRecord existing = records.findByApplicationReference(application.reference()).orElse(null);

        String rawPayload = rawPayloadJson(openedBy, comment, application);
        String message = existing != null
                ? "Compte déjà ouvert. Informations compte/RIB mises à jour par le back-office."
                : "Compte ouvert avec succès avec RIB saisi par le back-office.";

        // SERVER_PAYMENT_LOCK_BEFORE_ACCOUNT_OPENING_V1
        assertPaymentOkBeforeAccountOpening(application);

        // PAYMENT_GUARD_BEFORE_ACCOUNT_OPENED_V2
        String paymentStatus = null;
        if (application.packagePaymentReference() != null && !application.packagePaymentReference().isEmpty()) {
            paymentStatus = payments.findStatusByPaymentReference(application.packagePaymentReference())
                    .orElse(null);
        }

        var check = AccountOpeningRules.canOpenAccount(application, paymentStatus);
        if (!check.allowed()) {
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("status", "PAYMENT_REQUIRED_NOT_CONFIRMED");
            detail.put("message", check.reason());
            detail.put("application_reference", application.reference());
            detail.put("package_payment_reference", application.packagePaymentReference());
            detail.put("package_payment_status", application.packagePaymentStatus());
            detail.put("payment_status", paymentStatus);
            throw new ApiException(403, (Object) detail);
        }

        AccountOpeningRecord toSave = existing != null
                ? existing.withAccountInfo(accountNumber, rib, "OPENED", rawPayload)
                : new AccountOpeningRecord(
                        null,
                        application.id(),
                        application.reference(),
                        application.email(),
                        accountNumber,
                        rib,
                        "OPENED",
                        LocalDateTime.now(ZoneOffset.UTC),
                        rawPayload);

        AccountOpeningRecord saved = records.save(toSave);

        applications.updateStatus(application.id(), "ACCOUNT_OPENED");

        Map<String, Object> whatsappNotification;
        try {
            Map<String, Object> context = new LinkedHashMap<>();
            context.put("full_name", fullName(application));
            context.put("reference", application.reference());
            context.put("application_reference", application.reference());
            context.put("account_number", accountNumber);
            context.put("final_rib", rib);
            whatsappNotification = notifications.sendEvent(
                    application.phone() == null ? "" : application.phone(), "COMPTE_OUVERT", context);
        } catch (Exception exc) {
            whatsappNotification = new LinkedHashMap<>();
            whatsappNotification.put("success", false);
            whatsappNotification.put("status", "WHATSAPP_EXCEPTION");
            whatsappNotification.put("error", String.valueOf(exc.getMessage()));
        }

        // Convention Phase 2 : audit sur chaque action (le monolithe FastAPI n'auditait pas cette route).
        audit.log(actorUsername, "ACCOUNT_OPENED", "AccountApplication", application.reference(),
                "account_number=" + accountNumber + ", opened_by=" + openedBy,
                ipAddress, userAgent);

        return new OpenAccountResult(message, "ACCOUNT_OPENED", toView(saved), whatsappNotification);
    }

    @Override
    @Transactional(readOnly = true)
    public OpenedAccountView getOpenedAccount(String applicationReference) {
        AccountOpeningRecord record = records.findByApplicationReference(applicationReference)
                .orElseThrow(() -> ApiException.notFound("Aucun compte ouvert pour ce dossier."));
        return toView(record);
    }

    /** Parité _assert_payment_ok_before_account_opening. */
    private static void assertPaymentOkBeforeAccountOpening(ApplicationDetail application) {
        boolean required = AccountOpeningRules.paymentRequiredBeforeOpening(application);
        boolean confirmed = AccountOpeningRules.paymentConfirmedBeforeOpening(application);

        if (required && !confirmed) {
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("status", "PAYMENT_REQUIRED_NOT_CONFIRMED");
            detail.put("message",
                    "Ouverture du compte bloquée : le paiement package est requis mais non confirmé.");
            detail.put("application_reference", application.reference());
            detail.put("package_payment_reference", application.packagePaymentReference());
            detail.put("package_payment_status", application.packagePaymentStatus());
            detail.put("package_payment_amount", application.packagePaymentAmount());
            detail.put("package_payment_currency", application.packagePaymentCurrency());
            throw new ApiException(403, (Object) detail);
        }
    }

    private static OpenedAccountView toView(AccountOpeningRecord record) {
        return new OpenedAccountView(
                record.applicationReference(),
                record.clientEmail(),
                record.accountNumber(),
                record.rib(),
                record.status(),
                record.createdAt());
    }

    /** Parité raw_payload (json.dumps ensure_ascii=False). */
    private static String rawPayloadJson(String openedBy, String comment, ApplicationDetail application) {
        return "{\"source\": \"BACKOFFICE_MANUAL_INPUT\""
                + ", \"opened_by\": " + jsonString(openedBy)
                + ", \"comment\": " + jsonString(comment)
                + ", \"saved_at\": " + jsonString(LocalDateTime.now(ZoneOffset.UTC).toString())
                + ", \"package_payment_reference\": " + jsonString(application.packagePaymentReference())
                + ", \"package_payment_status\": " + jsonString(application.packagePaymentStatus())
                + "}";
    }

    private static String jsonString(String value) {
        if (value == null) {
            return "null";
        }
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static String fullName(ApplicationDetail application) {
        String firstName = strip(application.firstName());
        String lastName = strip(application.lastName());
        String fullName = (firstName + " " + lastName).strip();
        return fullName.isEmpty() ? "Cher client" : fullName;
    }

    private static String strip(String value) {
        return value == null ? "" : value.strip();
    }
}
