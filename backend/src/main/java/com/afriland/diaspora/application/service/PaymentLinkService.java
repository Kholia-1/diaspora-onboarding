package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.GeneratePaymentLinkUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.NotificationPort;
import com.afriland.diaspora.application.port.out.PaymentPort;
import com.afriland.diaspora.application.port.out.PaymentPort.CheckoutSession;
import com.afriland.diaspora.application.port.out.PaymentRepositoryPort;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.PaymentTransaction;
import com.afriland.diaspora.domain.service.PackagePaymentRules;
import com.afriland.diaspora.config.AppProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class PaymentLinkService implements GeneratePaymentLinkUseCase {

    private static final Set<String> CLIENT_ELIGIBLE_STATUSES =
            Set.of("APPROVED", "APPROVED_PENDING_PAYMENT", "PAYMENT_PENDING");
    private static final Set<String> BACKOFFICE_ELIGIBLE_STATUSES =
            Set.of("APPROVED", "APPROVED_PENDING_PAYMENT", "PAYMENT_PENDING", "PAYMENT_CONFIRMED");
    private static final Set<String> CONFIRMED_APP = Set.of("PAYMENT_CONFIRMED", "PAID", "ACCOUNT_OPENED", "CAPTURED");
    private static final Set<String> CONFIRMED_PAYMENT = Set.of("PAID", "PAYMENT_CONFIRMED", "CAPTURED");

    private final ApplicationRepositoryPort applications;
    private final PaymentRepositoryPort payments;
    private final PaymentPort paymentPort;
    private final NotificationPort notifications;
    private final AuditPort audit;
    private final String publicBaseUrl;

    public PaymentLinkService(ApplicationRepositoryPort applications, PaymentRepositoryPort payments,
                             PaymentPort paymentPort, NotificationPort notifications, AuditPort audit,
                             AppProperties properties) {
        this.applications = applications;
        this.payments = payments;
        this.paymentPort = paymentPort;
        this.notifications = notifications;
        this.audit = audit;
        this.publicBaseUrl = properties.publicBaseUrl() == null || properties.publicBaseUrl().isBlank()
                ? "https://diaspora-onboarding.com" : properties.publicBaseUrl();
    }

    @Override
    @Transactional
    public Map<String, Object> generateForClient(String applicationReference, String identifier,
                                                 boolean sendWhatsapp) {
        ApplicationDetail app = applications.findByReference(strip(applicationReference))
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable."));

        if (!identifierMatches(app, identifier)) {
            throw ApiException.forbidden(
                    "Vérification échouée. L'email ou le téléphone ne correspond pas au dossier.");
        }

        String status = upper(app.status());
        String decision = upper(app.reviewDecision());
        if (!"APPROVED".equals(decision) && !CLIENT_ELIGIBLE_STATUSES.contains(status)) {
            return notEligible("Le dossier n'est pas encore approuvé pour paiement.", app);
        }
        if (!Boolean.TRUE.equals(app.selectedPackagePaymentRequired())) {
            return notEligible("Aucun paiement n'est requis pour ce dossier.", app);
        }

        PaymentTransaction payment = findExistingPayment(app);

        if (isAlreadyConfirmed(app, payment)) {
            return alreadyConfirmed(app);
        }

        double amount = firstPositive(
                app.selectedPackageOpeningFee(), app.selectedPackageSubscriptionFee(),
                app.selectedPackageMonthlyFee(), app.packagePaymentAmount());
        String currency = firstNonBlank(app.selectedPackageCurrency(), app.packagePaymentCurrency(), "XAF");

        return finalizeLink(app, payment, amount, currency, sendWhatsapp, false, null, null, null);
    }

    @Override
    @Transactional
    public Map<String, Object> generateForBackoffice(String applicationReference, Double amountOverride,
                                                     boolean sendWhatsapp, String actorUsername,
                                                     String ipAddress, String userAgent) {
        ApplicationDetail app = lookupByReferenceOrId(strip(applicationReference));

        String status = upper(app.status());
        String decision = upper(app.reviewDecision());
        boolean eligible = "APPROVED".equals(decision) || "ACCOUNT_APPROVED".equals(decision)
                || BACKOFFICE_ELIGIBLE_STATUSES.contains(status);
        if (!eligible) {
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("status", "DOSSIER_NOT_APPROVED");
            detail.put("message", "Le dossier doit être approuvé avant génération du lien de paiement.");
            detail.put("application_status", app.status());
            detail.put("review_decision", app.reviewDecision());
            throw new ApiException(400, (Object) detail);
        }

        PaymentTransaction payment = findExistingPayment(app);

        if (isConfirmedBackoffice(app, payment)) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("status", "PAYMENT_ALREADY_CONFIRMED");
            response.put("message", "Le paiement est déjà confirmé pour ce dossier.");
            response.put("application_reference", app.reference());
            response.put("payment_reference",
                    payment != null ? payment.paymentReference() : app.packagePaymentReference());
            return response;
        }

        double amount = firstPositive(
                app.packagePaymentAmount(), app.selectedPackageOpeningFee(),
                app.selectedPackageSubscriptionFee(), app.selectedPackageMonthlyFee(),
                amountOverride == null ? null : BigDecimal.valueOf(amountOverride));
        String currency = firstNonBlank(app.packagePaymentCurrency(), app.selectedPackageCurrency(), "XAF");

        return finalizeLink(app, payment, amount, currency, sendWhatsapp, true,
                actorUsername, ipAddress, userAgent);
    }

    /** Coeur commun : crée/réutilise le paiement, la session Mastercard, synchronise et notifie. */
    private Map<String, Object> finalizeLink(ApplicationDetail app, PaymentTransaction existing, double amount,
                                             String currency, boolean sendWhatsapp, boolean backoffice,
                                             String actorUsername, String ipAddress, String userAgent) {
        PaymentTransaction payment = existing;

        if (payment == null) {
            if (amount <= 0) {
                throw ApiException.badRequest(backoffice
                        ? "Montant de paiement absent. Renseignez le montant du package ou un montant test."
                        : "Montant de paiement invalide ou absent sur le package du dossier.");
            }
            payment = payments.save(new PaymentTransaction(
                    null, PackagePaymentRules.buildPaymentReference(), app.id(), app.reference(), app.email(),
                    firstNonBlank(app.selectedPackageCode(), null, "PACKAGE"),
                    firstNonBlank(app.selectedPackageName(), null, "Package ouverture de compte"),
                    BigDecimal.valueOf(amount), currency, "MASTERCARD", app.selectedPackageCode(),
                    null, "PENDING", null, LocalDateTime.now(ZoneOffset.UTC), null, null, null));
        }

        CheckoutSession session = null;
        if (isBlank(payment.providerTransactionId()) || isBlank(payment.paymentUrl())) {
            session = paymentPort.createCheckoutSession(
                    payment.paymentReference(), payment.amount(), payment.currency(),
                    "Paiement package - " + app.reference());
            payment = payment.withProviderSession(
                    session.sessionId() != null ? session.sessionId() : payment.providerTransactionId(),
                    session.paymentUrl() != null ? session.paymentUrl() : payment.paymentUrl(),
                    "{\"status\":\"" + session.status() + "\"}");
            payment = payments.save(payment);
        }

        if (isBlank(payment.paymentUrl())) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", false);
            response.put("status", "PAYMENT_LINK_NOT_CREATED");
            response.put("message", backoffice
                    ? "La session Mastercard n'a pas pu être créée."
                    : "Le lien de paiement n'a pas pu être créé. Veuillez contacter la banque.");
            response.put("application_reference", app.reference());
            response.put("payment_reference", payment.paymentReference());
            response.put("session_result", session == null ? null : session.status());
            return response;
        }

        if (backoffice) {
            applications.markPackagePaymentRequired(app.id());
        }
        applications.syncPackagePayment(app.id(), payment.paymentReference(), payment.status(),
                payment.provider(), payment.amount(), payment.currency(), payment.paymentUrl(),
                "APPROVED_PENDING_PAYMENT");

        String fullPaymentUrl = absoluteUrl(payment.paymentUrl());

        Map<String, Object> whatsapp = null;
        if (sendWhatsapp) {
            whatsapp = notifyPaymentLink(app, payment, fullPaymentUrl);
        }

        if (backoffice) {
            audit.log(actorUsername, "PACKAGE_PAYMENT_LINK_GENERATED", "AccountApplication", app.reference(),
                    "payment_reference=" + payment.paymentReference() + ", amount=" + payment.amount(),
                    ipAddress, userAgent);
        }

        return paymentLinkReady(app, payment, fullPaymentUrl, session, backoffice);
    }

    private Map<String, Object> notifyPaymentLink(ApplicationDetail app, PaymentTransaction payment,
                                                  String fullPaymentUrl) {
        try {
            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("full_name", (safe(app.firstName()) + " " + safe(app.lastName())).strip());
            ctx.put("reference", app.reference());
            ctx.put("package_name",
                    firstNonBlank(payment.packageName(), app.selectedPackageName(), "votre package"));
            ctx.put("amount", payment.amount());
            ctx.put("currency", payment.currency());
            ctx.put("payment_url", fullPaymentUrl);
            return notifications.sendEvent(app.phone() == null ? "" : app.phone(), "LIEN_PAIEMENT", ctx);
        } catch (Exception e) {
            Map<String, Object> failed = new LinkedHashMap<>();
            failed.put("sent", false);
            failed.put("status", "WHATSAPP_NOTIFICATION_FAILED");
            failed.put("error", String.valueOf(e.getMessage()));
            return failed;
        }
    }

    private Map<String, Object> paymentLinkReady(ApplicationDetail app, PaymentTransaction payment,
                                                 String fullPaymentUrl, CheckoutSession session,
                                                 boolean backoffice) {
        Map<String, Object> applicationMap = new LinkedHashMap<>();
        applicationMap.put("reference", app.reference());
        applicationMap.put("client", (safe(app.firstName()) + " " + safe(app.lastName())).strip());
        if (backoffice) {
            applicationMap.put("phone", app.phone());
            applicationMap.put("email", app.email());
            applicationMap.put("review_decision", app.reviewDecision());
        }
        applicationMap.put("status", "APPROVED_PENDING_PAYMENT");
        applicationMap.put("package_payment_status", payment.status());

        Map<String, Object> paymentMap = new LinkedHashMap<>();
        paymentMap.put("payment_reference", payment.paymentReference());
        paymentMap.put("amount", payment.amount());
        paymentMap.put("currency", payment.currency());
        paymentMap.put("status", payment.status());
        paymentMap.put("provider", payment.provider());
        paymentMap.put("session_mastercard", payment.providerTransactionId());
        paymentMap.put("payment_url", payment.paymentUrl());
        paymentMap.put("full_payment_url", fullPaymentUrl);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("status", "PAYMENT_LINK_READY");
        response.put("message", "Lien de paiement disponible.");
        response.put("application", applicationMap);
        response.put("payment", paymentMap);
        if (backoffice) {
            response.put("session_result", session == null ? null : session.status());
        }
        response.put("whatsapp", null);
        return response;
    }

    private PaymentTransaction findExistingPayment(ApplicationDetail app) {
        if (!isBlank(app.packagePaymentReference())) {
            PaymentTransaction byRef = payments.findByPaymentReference(app.packagePaymentReference()).orElse(null);
            if (byRef != null) {
                return byRef;
            }
        }
        return payments.findLatestByApplicationReference(app.reference()).orElse(null);
    }

    private ApplicationDetail lookupByReferenceOrId(String reference) {
        return applications.findByReference(reference)
                .or(() -> reference.chars().allMatch(Character::isDigit)
                        ? applications.findById(Long.parseLong(reference))
                        : java.util.Optional.empty())
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable."));
    }

    private boolean identifierMatches(ApplicationDetail app, String identifier) {
        String value = identifier == null ? "" : identifier.strip().toLowerCase(Locale.ROOT);
        if (value.isEmpty()) {
            return false;
        }
        String appEmail = app.email() == null ? "" : app.email().strip().toLowerCase(Locale.ROOT);
        if (!appEmail.isEmpty() && value.equals(appEmail)) {
            return true;
        }
        String inputPhone = value.replaceAll("\\D", "");
        String appPhone = app.phone() == null ? "" : app.phone().replaceAll("\\D", "");
        if (inputPhone.isEmpty() || appPhone.isEmpty()) {
            return false;
        }
        return inputPhone.equals(appPhone) || appPhone.endsWith(inputPhone) || inputPhone.endsWith(appPhone);
    }

    private static boolean isAlreadyConfirmed(ApplicationDetail app, PaymentTransaction payment) {
        String appStatus = upper(firstNonBlank(app.packagePaymentStatus(), app.status(), ""));
        String paymentStatus = upper(payment == null ? "" : payment.status());
        return CONFIRMED_APP.contains(appStatus) || CONFIRMED_PAYMENT.contains(paymentStatus);
    }

    private static boolean isConfirmedBackoffice(ApplicationDetail app, PaymentTransaction payment) {
        String appPayment = upper(app.packagePaymentStatus());
        String appStatus = upper(app.status());
        String paymentStatus = upper(payment == null ? "" : payment.status());
        return CONFIRMED_PAYMENT.contains(appPayment) || "PAYMENT_CONFIRMED".equals(appStatus)
                || CONFIRMED_PAYMENT.contains(paymentStatus);
    }

    private Map<String, Object> notEligible(String message, ApplicationDetail app) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", false);
        response.put("status", "NOT_ELIGIBLE");
        response.put("message", message);
        response.put("application_reference", app.reference());
        response.put("application_status", app.status());
        response.put("package_payment_status", app.packagePaymentStatus());
        return response;
    }

    private Map<String, Object> alreadyConfirmed(ApplicationDetail app) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("status", "PAYMENT_ALREADY_CONFIRMED");
        response.put("message", "Le paiement est déjà confirmé pour ce dossier.");
        response.put("application_reference", app.reference());
        response.put("application_status", app.status());
        response.put("package_payment_status", app.packagePaymentStatus());
        return response;
    }

    private String absoluteUrl(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.isBlank()) {
            return null;
        }
        String value = pathOrUrl.strip();
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value;
        }
        String base = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + (value.startsWith("/") ? value : "/" + value);
    }

    private static double firstPositive(BigDecimal... values) {
        for (BigDecimal value : values) {
            if (value != null && value.doubleValue() > 0) {
                return value.doubleValue();
            }
        }
        return 0.0;
    }

    private static String firstNonBlank(String a, String b, String fallback) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        if (b != null && !b.isBlank()) {
            return b;
        }
        return fallback;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String upper(String value) {
        return value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
    }

    private static String strip(String value) {
        return value == null ? "" : value.strip();
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
