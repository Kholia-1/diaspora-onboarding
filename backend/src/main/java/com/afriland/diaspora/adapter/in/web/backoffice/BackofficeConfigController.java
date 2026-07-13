package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.adapter.in.web.HttpRequestMeta;
import com.afriland.diaspora.application.port.in.ManageBackofficeConfigUseCase;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Configuration back-office (authentifiée) : packages et intégrations API.
 * Parité app/routers/backoffice.py + api_integration_tests.py.
 */
@RestController
@RequestMapping("/api/backoffice")
public class BackofficeConfigController {

    private final ManageBackofficeConfigUseCase config;

    public BackofficeConfigController(ManageBackofficeConfigUseCase config) {
        this.config = config;
    }

    @GetMapping("/packages")
    public Map<String, Object> getPackages() {
        return config.getPackages();
    }

    @PostMapping("/packages")
    public Map<String, Object> savePackages(@RequestBody(required = false) Map<String, Object> payload,
                                            Authentication authentication, HttpServletRequest request) {
        return config.savePackages(payload == null ? Map.of() : payload,
                actor(authentication), HttpRequestMeta.clientIp(request), HttpRequestMeta.userAgent(request));
    }

    @GetMapping("/api-integrations")
    public Map<String, Object> getApiIntegrations() {
        return config.getApiIntegrations();
    }

    @PostMapping("/api-integrations")
    public Map<String, Object> saveApiIntegrations(@RequestBody(required = false) Map<String, Object> payload,
                                                   Authentication authentication, HttpServletRequest request) {
        return config.saveApiIntegrations(payload == null ? Map.of() : payload,
                actor(authentication), HttpRequestMeta.clientIp(request), HttpRequestMeta.userAgent(request));
    }

    @PostMapping("/api-integrations/{integrationCode}/test")
    public Map<String, Object> testIntegration(@PathVariable String integrationCode) {
        return config.testIntegration(integrationCode);
    }

    private static String actor(Authentication authentication) {
        return authentication != null ? authentication.getName() : null;
    }
}
