package com.afriland.diaspora.adapter.out.payment;

import com.afriland.diaspora.application.port.out.PaymentPort;
import com.afriland.diaspora.config.AppProperties;
import com.afriland.diaspora.domain.service.MastercardReconciliation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Adapter Mastercard Hosted Checkout (MPGS) — parité avec mastercard_gateway_service.py.
 * Fail-safe : config incomplète / passerelle indisponible → résultats dégradés, jamais d'exception.
 */
@Component
public class MastercardHostedCheckoutAdapter implements PaymentPort {

    private static final Logger log = LoggerFactory.getLogger(MastercardHostedCheckoutAdapter.class);

    private final AppProperties properties;
    private final RestClient restClient;

    public MastercardHostedCheckoutAdapter(AppProperties properties) {
        this.properties = properties;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(30));
        factory.setReadTimeout(Duration.ofSeconds(30));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                // Ne lève pas sur 4xx/5xx : on lit le corps d'erreur (parité try/except du legacy).
                .defaultStatusHandler(status -> true, (request, response) -> {
                })
                .build();
    }

    @Override
    public CheckoutSession createCheckoutSession(String orderId, BigDecimal amount, String currency,
                                                 String description) {
        MastercardConfig config = MastercardConfig.resolve(properties);

        List<String> missing = config.validate();
        String paymentUrl = "/api/payments/mastercard/checkout/" + orderId;

        if (!missing.isEmpty()) {
            return new CheckoutSession(false, "CONFIG_INCOMPLETE", orderId, null, null, null,
                    null, missing, Map.of());
        }

        Map<String, Object> payload = buildInitiatePayload(config, orderId, amount,
                currency == null || currency.isBlank() ? config.currency() : currency, description);

        try {
            ResponseEntity<Map> entity = restClient.post()
                    .uri(config.baseUrl() + config.sessionPath())
                    .header("Authorization", basicAuth(config))
                    .header("User-Agent", "Diaspora-Onboarding-Mastercard/1.0")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toEntity(Map.class);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = entity.getBody() == null ? Map.of() : entity.getBody();
            boolean httpOk = entity.getStatusCode().is2xxSuccessful();

            Map<String, Object> session = asMap(response.get("session"));
            String sessionId = str(session.get("id"));
            String sessionVersion = str(session.get("version"));
            String successIndicator = str(response.get("successIndicator"));

            if (!httpOk || sessionId.isEmpty() || successIndicator.isEmpty()) {
                return new CheckoutSession(false, "SESSION_CREATION_FAILED", orderId, emptyToNull(sessionId),
                        emptyToNull(successIndicator), emptyToNull(sessionVersion), null, List.of(), response);
            }

            return new CheckoutSession(true, "SESSION_CREATED", orderId, sessionId, successIndicator,
                    sessionVersion, paymentUrl, List.of(), response);

        } catch (Exception e) {
            log.warn("[MASTERCARD] création session indisponible : {}", e.getMessage());
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", String.valueOf(e.getMessage()));
            return new CheckoutSession(false, "SESSION_CREATION_FAILED", orderId, null, null, null,
                    null, List.of(), err);
        }
    }

    @Override
    public OrderVerification retrieveOrder(String orderId, String expectedCurrency, double expectedAmount) {
        MastercardConfig config = MastercardConfig.resolve(properties);

        if (!config.validate().isEmpty()) {
            return new OrderVerification(false, false, orderId, null, null, null, null,
                    0.0, 0.0, null, Map.of());
        }

        try {
            ResponseEntity<Map> entity = restClient.get()
                    .uri(config.baseUrl() + config.orderPath(orderId))
                    .header("Authorization", basicAuth(config))
                    .header("User-Agent", "Diaspora-Onboarding-Mastercard/1.0")
                    .retrieve()
                    .toEntity(Map.class);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = entity.getBody() == null ? Map.of() : entity.getBody();
            boolean httpOk = entity.getStatusCode().is2xxSuccessful();
            int httpStatus = entity.getStatusCode().value();

            String result = str(response.get("result"));
            String status = str(response.get("status"));
            String currency = orDefault(str(response.get("currency")), expectedCurrency);
            double captured = safeDouble(response.get("totalCapturedAmount"));
            double authorized = safeDouble(response.get("totalAuthorizedAmount"));
            String gatewayCode = extractGatewayCode(response);

            boolean paid = MastercardReconciliation.isPaid(
                    result, status, gatewayCode, currency, expectedCurrency, captured, expectedAmount);

            return new OrderVerification(httpOk, paid, orderId, emptyToNull(result), emptyToNull(status),
                    emptyToNull(gatewayCode), emptyToNull(currency), captured, authorized, httpStatus, response);

        } catch (Exception e) {
            log.warn("[MASTERCARD] retrieve order indisponible : {}", e.getMessage());
            return new OrderVerification(false, false, orderId, null, null, null, null,
                    0.0, 0.0, null, Map.of());
        }
    }

    @Override
    public Map<String, Object> publicConfigStatus() {
        return MastercardConfig.resolve(properties).publicStatus();
    }

    private static Map<String, Object> buildInitiatePayload(MastercardConfig config, String orderId,
                                                            BigDecimal amount, String currency, String description) {
        Map<String, Object> merchant = new LinkedHashMap<>();
        merchant.put("name", config.merchantName());
        merchant.put("url", config.merchantUrl());

        Map<String, Object> displayControl = new LinkedHashMap<>();
        displayControl.put("billingAddress", "HIDE");
        displayControl.put("customerEmail", "HIDE");
        displayControl.put("shipping", "HIDE");

        Map<String, Object> interaction = new LinkedHashMap<>();
        interaction.put("operation", config.operation());
        interaction.put("returnUrl", config.returnUrl());
        interaction.put("merchant", merchant);
        interaction.put("displayControl", displayControl);

        Map<String, Object> order = new LinkedHashMap<>();
        order.put("id", orderId);
        order.put("amount", formatAmount(amount));
        order.put("currency", currency);
        order.put("description", description == null || description.isBlank()
                ? "Paiement package ouverture de compte diaspora" : description);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("apiOperation", "INITIATE_CHECKOUT");
        payload.put("checkoutMode", "WEBSITE");
        payload.put("interaction", interaction);
        payload.put("order", order);
        return payload;
    }

    /** Parité find_payment_transaction + tx.response.gatewayCode. */
    @SuppressWarnings("unchecked")
    private static String extractGatewayCode(Map<String, Object> response) {
        Object txObj = response.get("transaction");
        if (!(txObj instanceof List<?> transactions) || transactions.isEmpty()) {
            return "";
        }

        Map<String, Object> chosen = null;
        for (int i = transactions.size() - 1; i >= 0; i--) {
            if (transactions.get(i) instanceof Map<?, ?> tx) {
                Map<String, Object> txMap = (Map<String, Object>) tx;
                Map<String, Object> inner = asMap(txMap.get("transaction"));
                String type = str(inner.get("type"));
                if (type.isEmpty()) {
                    type = str(txMap.get("type"));
                }
                if ("PAYMENT".equalsIgnoreCase(type)) {
                    chosen = txMap;
                    break;
                }
            }
        }
        if (chosen == null && transactions.get(transactions.size() - 1) instanceof Map<?, ?> last) {
            chosen = (Map<String, Object>) last;
        }
        if (chosen == null) {
            return "";
        }
        return str(asMap(chosen.get("response")).get("gatewayCode"));
    }

    private static String formatAmount(BigDecimal amount) {
        BigDecimal value = amount == null ? BigDecimal.ZERO : amount;
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String basicAuth(MastercardConfig config) {
        String raw = "merchant." + config.merchantId() + ":" + config.apiPassword();
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }

    private static double safeDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return 0.0;
        }
    }
}
