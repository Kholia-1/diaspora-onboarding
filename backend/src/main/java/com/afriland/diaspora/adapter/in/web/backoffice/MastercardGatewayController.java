package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.application.port.in.MastercardPaymentUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Back-office Mastercard (authentifié) — parité app/routers/mastercard_gateway.py (routes portées). */
@RestController
@RequestMapping("/api/backoffice/mastercard")
public class MastercardGatewayController {

    private final MastercardPaymentUseCase payments;

    public MastercardGatewayController(MastercardPaymentUseCase payments) {
        this.payments = payments;
    }

    @GetMapping("/config-status")
    public Map<String, Object> configStatus() {
        return payments.configStatus();
    }

    @GetMapping("/operational-config")
    public Map<String, Object> operationalConfig() {
        return payments.operationalConfig();
    }

    @PostMapping("/operational-config")
    public Map<String, Object> saveOperationalConfig(@RequestBody(required = false) Map<String, Object> payload) {
        return payments.saveOperationalConfig(payload == null ? Map.of() : payload);
    }
}
