package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.port.in.MastercardPaymentUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/** Endpoints Mastercard PUBLICS (permitAll) — parité app/routers/mastercard_payments_public.py (routes actives). */
@RestController
@RequestMapping("/api/payments/mastercard")
public class MastercardPaymentsController {

    private final MastercardPaymentUseCase payments;

    public MastercardPaymentsController(MastercardPaymentUseCase payments) {
        this.payments = payments;
    }

    @PostMapping("/create-checkout-session")
    public Map<String, Object> createCheckoutSession(@RequestBody(required = false) Map<String, Object> payload) {
        return payments.createCheckoutSession(payload == null ? Map.of() : payload);
    }

    @GetMapping("/webhook")
    public Map<String, Object> webhookHealthcheck() {
        return payments.webhookHealthcheck();
    }

    @PostMapping("/webhook")
    public Map<String, Object> webhook(@RequestBody(required = false) Map<String, Object> body) {
        return payments.handleWebhook(body == null ? Map.of() : body);
    }

    @GetMapping("/records/latest")
    public Map<String, Object> latestRecord(
            @RequestParam(name = "order_id", required = false, defaultValue = "") String orderId,
            @RequestParam(name = "result_indicator", required = false, defaultValue = "") String resultIndicator,
            @RequestParam(name = "session_id", required = false, defaultValue = "") String sessionId,
            @RequestParam(name = "dossier_id", required = false, defaultValue = "") String dossierId,
            @RequestParam(name = "client_reference", required = false, defaultValue = "") String clientReference) {
        return payments.latestRecord(orderId, resultIndicator, sessionId, dossierId, clientReference);
    }

    @GetMapping("/application-payment-summary/{applicationReference}")
    public Map<String, Object> applicationPaymentSummary(@PathVariable String applicationReference) {
        return payments.applicationPaymentSummary(applicationReference);
    }

    /**
     * Retour Mastercard : stub JSON. Le rendu client (page de retour) est porté côté React (Phase 5) ;
     * la réconciliation serveur se fait via le webhook.
     */
    @GetMapping("/return")
    public Map<String, Object> mastercardReturn(@RequestParam Map<String, String> queryParams) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("status", "RETURN_RECEIVED");
        response.put("message", "Retour Mastercard reçu. La confirmation est traitée via le webhook.");
        response.put("query_params", queryParams);
        return response;
    }
}
