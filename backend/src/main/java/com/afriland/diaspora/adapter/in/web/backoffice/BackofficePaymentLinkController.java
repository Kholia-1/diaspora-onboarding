package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.adapter.in.web.HttpRequestMeta;
import com.afriland.diaspora.application.port.in.GeneratePaymentLinkUseCase;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Lien de paiement back-office (authentifié) — parité backoffice_payment_link.py. */
@RestController
@RequestMapping("/api/backoffice/payment-link")
public class BackofficePaymentLinkController {

    private final GeneratePaymentLinkUseCase paymentLinks;

    public BackofficePaymentLinkController(GeneratePaymentLinkUseCase paymentLinks) {
        this.paymentLinks = paymentLinks;
    }

    @PostMapping("/{applicationReference}/generate")
    public Map<String, Object> generate(@PathVariable String applicationReference,
                                        @RequestBody(required = false) GeneratePaymentLinkPayload payload,
                                        Authentication authentication, HttpServletRequest request) {
        GeneratePaymentLinkPayload body = payload == null
                ? new GeneratePaymentLinkPayload(null, null) : payload;
        return paymentLinks.generateForBackoffice(
                applicationReference,
                body.amountOverride(),
                Boolean.TRUE.equals(body.sendWhatsapp()),
                authentication != null ? authentication.getName() : null,
                HttpRequestMeta.clientIp(request),
                HttpRequestMeta.userAgent(request));
    }

    public record GeneratePaymentLinkPayload(Double amountOverride, Boolean sendWhatsapp) {
    }
}
