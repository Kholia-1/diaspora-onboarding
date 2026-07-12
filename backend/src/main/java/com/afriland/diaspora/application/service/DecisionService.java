package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.DecideApplicationUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.NotificationPort;
import com.afriland.diaspora.application.port.out.PaymentRepositoryPort;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.service.AccountOpeningRules;
import com.afriland.diaspora.domain.service.DecisionRules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class DecisionService implements DecideApplicationUseCase {

    private final ApplicationRepositoryPort applications;
    private final PaymentRepositoryPort payments;
    private final NotificationPort notifications;
    private final AuditPort audit;

    public DecisionService(ApplicationRepositoryPort applications, PaymentRepositoryPort payments,
                           NotificationPort notifications, AuditPort audit) {
        this.applications = applications;
        this.payments = payments;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Override
    @Transactional
    public DecisionResult decide(String actorUsername, long applicationId, DecisionCommand command,
                                 String ipAddress, String userAgent) {
        ApplicationDetail application = applications.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Demande introuvable"));

        String decision = command.decision();

        if (!DecisionRules.isAllowed(decision)) {
            throw ApiException.badRequest(DecisionRules.invalidDecisionDetail());
        }

        // BACKOFFICE_PAYMENT_GUARD_ACCOUNT_OPENED_V2
        String paymentStatus = findLinkedPaymentStatus(application);
        if ("ACCOUNT_OPENED".equals(decision)) {
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
        }

        applications.applyDecision(
                applicationId,
                decision,
                command.reviewedBy(),
                command.comment(),
                command.clientMessage(),
                command.finalRib(),
                command.accountNumber(),
                LocalDateTime.now(ZoneOffset.UTC));

        // BACKOFFICE_AUTO_PAYMENT_AFTER_APPROVAL_V1 (portage partiel : la création de la
        // session Mastercard sera consolidée avec la phase paiement).
        Map<String, Object> paymentWorkflow = null;
        if ("APPROVED".equals(decision)) {
            paymentWorkflow = runPaymentWorkflowAfterApproval(application);
        }

        String actor = actorUsername != null && !actorUsername.isBlank() ? actorUsername : command.reviewedBy();
        audit.log(actor, "APPLICATION_DECISION", "AccountApplication", application.reference(),
                decisionDetailsJson(decision, command.comment(), command.accountNumber()),
                ipAddress, userAgent);

        // WHATSAPP_NOTIFY_BACKOFFICE_DECISION_V1 — best-effort, jamais bloquant.
        Map<String, Object> whatsappResult = null;
        if (application.phone() != null && !application.phone().isEmpty()) {
            try {
                String message = DecisionRules.buildClientMessage(
                        decision,
                        application.firstName(),
                        application.reference(),
                        application.packagePaymentUrl(),
                        command.clientMessage(),
                        command.comment(),
                        command.accountNumber(),
                        command.finalRib());
                whatsappResult = notifications.sendMessage(application.phone(), message);
            } catch (Exception exc) {
                whatsappResult = new LinkedHashMap<>();
                whatsappResult.put("success", false);
                whatsappResult.put("status", "WHATSAPP_EXCEPTION");
                whatsappResult.put("error", String.valueOf(exc.getMessage()));
            }
        }

        return new DecisionResult(
                "Décision back-office enregistrée",
                application.reference(),
                decision,
                command.reviewedBy(),
                decision,
                paymentWorkflow,
                whatsappResult);
    }

    private String findLinkedPaymentStatus(ApplicationDetail application) {
        String reference = application.packagePaymentReference();
        if (reference == null || reference.isEmpty()) {
            return null;
        }
        return payments.findStatusByPaymentReference(reference).orElse(null);
    }

    /**
     * Parité partielle de create_package_payment_after_approval : les branches
     * "paiement non requis" sont reproduites ; la création de session Mastercard
     * (paiement requis) n'est pas encore migrée.
     */
    private Map<String, Object> runPaymentWorkflowAfterApproval(ApplicationDetail application) {
        boolean explicitRequired = Boolean.TRUE.equals(application.selectedPackagePaymentRequired());
        double amount = AccountOpeningRules.packageAmount(application);

        Map<String, Object> workflow = new LinkedHashMap<>();

        if (!explicitRequired && amount <= 0) {
            applications.updatePackagePaymentStatus(application.id(), "NOT_REQUIRED");
            workflow.put("payment_required", false);
            workflow.put("message", "Aucun paiement requis pour ce package.");
            return workflow;
        }

        if (amount <= 0) {
            applications.updatePackagePaymentStatus(application.id(), "NOT_REQUIRED");
            workflow.put("payment_required", false);
            workflow.put("message", "Package marqué payant mais montant nul.");
            return workflow;
        }

        workflow.put("payment_required", true);
        workflow.put("status", "PAYMENT_WORKFLOW_NON_MIGRE");
        workflow.put("message",
                "Création automatique du paiement package non encore portée (phase paiement à venir).");
        return workflow;
    }

    /** Parité json.dumps({"decision":..., "comment":..., "account_number":...}, ensure_ascii=False). */
    private static String decisionDetailsJson(String decision, String comment, String accountNumber) {
        return "{\"decision\": " + jsonString(decision)
                + ", \"comment\": " + jsonString(comment)
                + ", \"account_number\": " + jsonString(accountNumber) + "}";
    }

    private static String jsonString(String value) {
        if (value == null) {
            return "null";
        }
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
