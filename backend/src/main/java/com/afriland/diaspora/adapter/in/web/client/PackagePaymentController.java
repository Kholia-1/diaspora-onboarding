package com.afriland.diaspora.adapter.in.web.client;

import com.afriland.diaspora.application.port.in.PackagePaymentUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Paiement package client PUBLIC — parité app/routers/payments.py.
 * Cohabite avec MastercardPaymentsController (/api/payments/mastercard/**) :
 * les chemins ne se chevauchent pas (segment /package/ et référence PAY-…).
 */
@RestController
@RequestMapping("/api/payments")
public class PackagePaymentController {

    private final PackagePaymentUseCase packagePayments;

    public PackagePaymentController(PackagePaymentUseCase packagePayments) {
        this.packagePayments = packagePayments;
    }

    /** Parité POST /api/payments/package/initiate/{application_reference}. */
    @PostMapping("/package/initiate/{applicationReference}")
    public Map<String, Object> initiate(@PathVariable String applicationReference) {
        return packagePayments.initiate(applicationReference);
    }

    /**
     * Parité GET /api/payments/{payment_reference}. Contrainte PAY-… pour ne pas
     * capter les sous-chemins littéraux (mastercard, package, client).
     */
    @GetMapping("/{paymentReference:PAY-.+}")
    public Map<String, Object> getPayment(@PathVariable String paymentReference) {
        return packagePayments.getPayment(paymentReference);
    }
}
