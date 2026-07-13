package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.MastercardPaymentUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.NotificationPort;
import com.afriland.diaspora.application.port.out.PaymentPort;
import com.afriland.diaspora.application.port.out.PaymentPort.CheckoutSession;
import com.afriland.diaspora.application.port.out.PaymentPort.OrderVerification;
import com.afriland.diaspora.application.port.out.PaymentRepositoryPort;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.PaymentTransaction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class MastercardPaymentService implements MastercardPaymentUseCase {

    private static final Set<String> CONFIRMED = Set.of("PAYMENT_CONFIRMED", "PAID", "CAPTURED");
    private static final Set<String> PENDING = Set.of("PENDING", "APPROVED_PENDING_PAYMENT", "PAYMENT_PENDING");

    private final PaymentPort paymentPort;
    private final PaymentRepositoryPort payments;
    private final ApplicationRepositoryPort applications;
    private final NotificationPort notifications;
    private final AuditPort audit;

    public MastercardPaymentService(PaymentPort paymentPort, PaymentRepositoryPort payments,
                                    ApplicationRepositoryPort applications, NotificationPort notifications,
                                    AuditPort audit) {
        this.paymentPort = paymentPort;
        this.payments = payments;
        this.applications = applications;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Override
    public Map<String, Object> createCheckoutSession(Map<String, Object> payload) {
        Map<String, Object> body = payload == null ? Map.of() : payload;

        BigDecimal amount = toBigDecimal(body.getOrDefault("amount", 500));
        String currency = str(body.getOrDefault("currency", "XAF"));
        String description = str(body.getOrDefault("description", "Paiement package Diaspora"));
        String orderId = strOrNull(body.get("order_id"));
        if (orderId == null || orderId.isBlank()) {
            orderId = "DIA-MC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        }

        CheckoutSession session = paymentPort.createCheckoutSession(orderId, amount, currency, description);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", session.success());
        response.put("status", session.status());
        response.put("order_id", session.orderId());
        response.put("session_id", session.sessionId());
        response.put("success_indicator", session.successIndicator());
        response.put("session_version", session.sessionVersion());
        response.put("payment_url", session.paymentUrl());
        response.put("missing", session.missing());
        response.put("gateway_response", session.gatewayResponse());

        Map<String, Object> storedSession = new LinkedHashMap<>();
        storedSession.put("created_at", LocalDateTime.now(ZoneOffset.UTC));
        storedSession.put("order_id", session.orderId());
        storedSession.put("amount", amount);
        storedSession.put("currency", currency);
        storedSession.put("description", description);
        storedSession.put("session_id", session.sessionId());
        storedSession.put("success_indicator", session.successIndicator());
        response.put("stored_session", storedSession);

        return response;
    }

    @Override
    public Map<String, Object> webhookHealthcheck() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("status", "WEBHOOK_ROUTE_AVAILABLE");
        response.put("message",
                "Route webhook Mastercard disponible. Utiliser POST pour les notifications réelles.");
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> handleWebhook(Map<String, Object> body) {
        Map<String, Object> payload = body == null ? Map.of() : body;

        String orderId = firstNonEmpty(payload, "order_id", "orderId");
        String paymentReference = firstNonEmpty(payload, "payment_reference", "paymentReference");
        String sessionId = firstNonEmpty(payload, "session_id", "sessionId");
        String applicationReference = firstNonEmpty(payload, "application_reference", "applicationReference");

        Map<String, Object> reconciliation = reconcile(orderId, paymentReference, sessionId, applicationReference);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("status", "WEBHOOK_RECEIVED");
        response.put("message", "Notification Mastercard reçue.");
        response.put("reconciliation", reconciliation);
        return response;
    }

    /** Réconciliation serveur — parité _mc_mark_package_payment_confirmed (via Retrieve Order). */
    private Map<String, Object> reconcile(String orderId, String paymentReference, String sessionId,
                                          String applicationReference) {
        PaymentTransaction payment = locatePayment(orderId, paymentReference, sessionId, applicationReference);

        if (payment == null) {
            return reconciliationResult(false, "PAYMENT_TRANSACTION_NOT_FOUND", paymentReference,
                    applicationReference, null);
        }

        double expectedAmount = payment.amount() == null ? 0.0 : payment.amount().doubleValue();
        String expectedCurrency = payment.currency() == null ? "XAF" : payment.currency();

        OrderVerification verification = paymentPort.retrieveOrder(
                payment.paymentReference(), expectedCurrency, expectedAmount);

        if (!verification.paid()) {
            return reconciliationResult(false, "PAYMENT_NOT_CONFIRMED", payment.paymentReference(),
                    payment.applicationReference(), null);
        }

        boolean alreadyPaid = "PAID".equalsIgnoreCase(payment.status());
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        if (!alreadyPaid) {
            payments.save(payment.markPaid(now, sessionId, verification.raw() == null ? null
                    : "{\"source\":\"MASTERCARD_MPGS_RETRIEVE_ORDER\"}"));
        }

        ApplicationDetail application = applications.findByReference(payment.applicationReference()).orElse(null);
        if (application != null) {
            applications.syncPackagePayment(application.id(), payment.paymentReference(), "PAYMENT_CONFIRMED",
                    "MASTERCARD", payment.amount(), payment.currency(), payment.paymentUrl(), "PAYMENT_CONFIRMED");

            if (!alreadyPaid) {
                notifyConfirmed(application, payment);
                audit.log(null, "PACKAGE_PAYMENT_CONFIRMED", "AccountApplication",
                        payment.applicationReference(),
                        "payment_reference=" + payment.paymentReference(), null, null);
            }
        }

        return reconciliationResult(true, alreadyPaid ? "ALREADY_CONFIRMED" : "PAYMENT_CONFIRMED_IN_DATABASE",
                payment.paymentReference(), payment.applicationReference(),
                application != null ? "PAYMENT_CONFIRMED" : null);
    }

    private PaymentTransaction locatePayment(String orderId, String paymentReference, String sessionId,
                                             String applicationReference) {
        if (paymentReference != null) {
            Optional<PaymentTransaction> byRef = payments.findByPaymentReference(paymentReference);
            if (byRef.isPresent()) {
                return byRef.get();
            }
        }
        if (orderId != null) {
            Optional<PaymentTransaction> byOrder = payments.findByPaymentReference(orderId);
            if (byOrder.isPresent()) {
                return byOrder.get();
            }
        }
        if (sessionId != null) {
            Optional<PaymentTransaction> bySession = payments.findByProviderTransactionId(sessionId);
            if (bySession.isPresent()) {
                return bySession.get();
            }
        }
        if (applicationReference != null) {
            return payments.findLatestByApplicationReference(applicationReference).orElse(null);
        }
        return null;
    }

    private void notifyConfirmed(ApplicationDetail application, PaymentTransaction payment) {
        try {
            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("full_name", (safe(application.firstName()) + " " + safe(application.lastName())).strip());
            ctx.put("reference", application.reference());
            ctx.put("application_reference", application.reference());
            ctx.put("payment_reference", payment.paymentReference());
            ctx.put("package_name", payment.packageName());
            ctx.put("amount", payment.amount());
            ctx.put("currency", payment.currency());
            notifications.sendEvent(application.phone() == null ? "" : application.phone(),
                    "PAIEMENT_CONFIRME", ctx);
        } catch (Exception ignored) {
            // Best-effort : la notification ne bloque jamais la confirmation.
        }
    }

    @Override
    public Map<String, Object> latestRecord(String orderId, String resultIndicator, String sessionId,
                                            String dossierId, String clientReference) {
        String order = strip(orderId);
        String result = strip(resultIndicator);
        String session = strip(sessionId);
        String dossier = strip(dossierId);
        String clientRef = strip(clientReference);

        if (order.isEmpty() && result.isEmpty() && session.isEmpty()
                && dossier.isEmpty() && clientRef.isEmpty()) {
            throw ApiException.badRequest(
                    "Un filtre est requis : order_id, result_indicator, session_id, dossier_id ou client_reference.");
        }

        PaymentTransaction payment = null;
        if (!order.isEmpty()) {
            payment = payments.findByPaymentReference(order).orElse(null);
        }
        if (payment == null && !session.isEmpty()) {
            payment = payments.findByProviderTransactionId(session).orElse(null);
        }
        if (payment == null && !clientRef.isEmpty()) {
            payment = payments.findLatestByApplicationReference(clientRef).orElse(null);
        }
        if (payment == null && !dossier.isEmpty()) {
            payment = payments.findLatestByApplicationReference(dossier).orElse(null);
        }

        if (payment == null) {
            throw ApiException.notFound("Aucun paiement ne correspond aux critères fournis.");
        }

        boolean paid = "PAID".equalsIgnoreCase(payment.status());
        Map<String, Object> safeRecord = new LinkedHashMap<>();
        safeRecord.put("paid", paid);
        safeRecord.put("verification_status", paid ? "PAYMENT_CONFIRMED" : "PAYMENT_NOT_CONFIRMED");
        safeRecord.put("order_id", payment.paymentReference());
        safeRecord.put("amount_captured", paid ? payment.amount() : null);
        safeRecord.put("currency", payment.currency());
        safeRecord.put("status", payment.status());
        safeRecord.put("provider", payment.provider());
        safeRecord.put("provider_transaction_id", payment.providerTransactionId());
        safeRecord.put("verified_at", payment.paidAt());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("status", "PAYMENT_RECORD_FOUND");
        response.put("payment", safeRecord);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> applicationPaymentSummary(String applicationReference) {
        ApplicationDetail app = applications.findByReference(applicationReference)
                .orElseThrow(() -> ApiException.notFound("Dossier introuvable."));

        PaymentTransaction payment = payments.findLatestByApplicationReference(app.reference()).orElse(null);

        double amountDue = app.packagePaymentAmount() == null ? 0.0 : app.packagePaymentAmount().doubleValue();
        String packageStatus = app.packagePaymentStatus() == null ? "" : app.packagePaymentStatus();
        boolean paymentRequired = Boolean.TRUE.equals(app.selectedPackagePaymentRequired()) || amountDue > 0;

        String paymentStatus = payment != null && payment.status() != null ? payment.status() : packageStatus;

        boolean confirmed = CONFIRMED.contains(packageStatus.toUpperCase(Locale.ROOT))
                || CONFIRMED.contains(paymentStatus.toUpperCase(Locale.ROOT));
        boolean pending = paymentRequired && !confirmed
                && PENDING.contains(paymentStatus.toUpperCase(Locale.ROOT));
        boolean canOpen = !paymentRequired || confirmed;

        Map<String, Object> applicationMap = new LinkedHashMap<>();
        applicationMap.put("id", app.id());
        applicationMap.put("reference", app.reference());
        applicationMap.put("client_name", (safe(app.firstName()) + " " + safe(app.lastName())).strip());
        applicationMap.put("email", app.email());
        applicationMap.put("application_status", app.status());
        applicationMap.put("review_decision", app.reviewDecision());
        applicationMap.put("package_name", app.selectedPackageName());
        applicationMap.put("payment_required", paymentRequired);
        applicationMap.put("package_payment_reference", app.packagePaymentReference());
        applicationMap.put("package_payment_status", app.packagePaymentStatus());
        applicationMap.put("package_payment_provider", app.packagePaymentProvider());
        applicationMap.put("package_payment_amount", app.packagePaymentAmount());
        applicationMap.put("package_payment_currency", app.packagePaymentCurrency());
        applicationMap.put("package_payment_url", app.packagePaymentUrl());

        Map<String, Object> paymentMap = new LinkedHashMap<>();
        paymentMap.put("exists", payment != null);
        paymentMap.put("payment_reference", payment != null ? payment.paymentReference() : null);
        paymentMap.put("amount", payment != null ? payment.amount() : null);
        paymentMap.put("currency", payment != null ? payment.currency() : null);
        paymentMap.put("provider", payment != null ? payment.provider() : null);
        paymentMap.put("provider_transaction_id", payment != null ? payment.providerTransactionId() : null);
        paymentMap.put("status", payment != null ? payment.status() : null);
        paymentMap.put("payment_url", payment != null ? payment.paymentUrl() : null);
        paymentMap.put("created_at", payment != null ? payment.createdAt() : null);
        paymentMap.put("paid_at", payment != null ? payment.paidAt() : null);
        paymentMap.put("failed_at", payment != null ? payment.failedAt() : null);

        Map<String, Object> computed = new LinkedHashMap<>();
        computed.put("payment_required", paymentRequired);
        computed.put("payment_confirmed", confirmed);
        computed.put("payment_pending", pending);
        computed.put("can_open_account", canOpen);
        computed.put("blocking_reason", canOpen ? null : "Paiement package requis mais non confirmé.");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("status", "PAYMENT_SUMMARY_FOUND");
        response.put("application", applicationMap);
        response.put("payment", paymentMap);
        response.put("computed", computed);
        return response;
    }

    @Override
    public Map<String, Object> configStatus() {
        return paymentPort.publicConfigStatus();
    }

    @Override
    public Map<String, Object> operationalConfig() {
        return paymentPort.publicConfigStatus();
    }

    @Override
    public Map<String, Object> saveOperationalConfig(Map<String, Object> payload) {
        // Divergence assumée : la configuration Mastercard est pilotée par l'environnement
        // (variables MASTERCARD_* / application.yml) et non par un fichier JSON éditable.
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message",
                "Configuration Mastercard résolue depuis l'environnement (MASTERCARD_* / application.yml). "
                        + "L'édition via API n'est pas persistée en Phase 4.");
        response.put("config", paymentPort.publicConfigStatus());
        return response;
    }

    private Map<String, Object> reconciliationResult(boolean updated, String status, String paymentReference,
                                                     String applicationReference, String applicationStatus) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("updated", updated);
        result.put("status", status);
        result.put("payment_reference", paymentReference);
        result.put("application_reference", applicationReference);
        result.put("application_status", applicationStatus);
        return result;
    }

    private static String firstNonEmpty(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            Object value = payload.get(key);
            if (value != null && !String.valueOf(value).isBlank()) {
                return String.valueOf(value).strip();
            }
        }
        return null;
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String strOrNull(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String strip(String value) {
        return value == null ? "" : value.strip();
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
