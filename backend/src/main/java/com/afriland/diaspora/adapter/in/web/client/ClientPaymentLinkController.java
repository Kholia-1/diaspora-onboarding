package com.afriland.diaspora.adapter.in.web.client;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.GeneratePaymentLinkUseCase;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Lien de paiement client — PUBLIC (protégé par email/téléphone). Parité client_payment_link.py. */
@RestController
@RequestMapping("/api/client/payment-link")
public class ClientPaymentLinkController {

    private final GeneratePaymentLinkUseCase paymentLinks;

    public ClientPaymentLinkController(GeneratePaymentLinkUseCase paymentLinks) {
        this.paymentLinks = paymentLinks;
    }

    @PostMapping("/generate")
    public Map<String, Object> generate(@RequestBody ClientPaymentLinkRequest payload) {
        if (payload == null || payload.applicationReference() == null
                || payload.applicationReference().isBlank()) {
            throw ApiException.badRequest("application_reference requis.");
        }
        return paymentLinks.generateForClient(
                payload.applicationReference(),
                payload.identifier(),
                Boolean.TRUE.equals(payload.sendWhatsapp()));
    }

    public record ClientPaymentLinkRequest(String applicationReference, String identifier, Boolean sendWhatsapp) {
    }
}
