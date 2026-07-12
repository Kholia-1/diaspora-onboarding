package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.adapter.in.web.HttpRequestMeta;
import com.afriland.diaspora.application.port.in.OpenAccountUseCase;
import com.afriland.diaspora.application.port.in.OpenAccountUseCase.OpenAccountCommand;
import com.afriland.diaspora.application.port.in.OpenAccountUseCase.OpenAccountResult;
import com.afriland.diaspora.application.port.in.OpenAccountUseCase.OpenedAccountView;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class BackofficeAccountOpeningController {

    private final OpenAccountUseCase accountOpening;

    public BackofficeAccountOpeningController(OpenAccountUseCase accountOpening) {
        this.accountOpening = accountOpening;
    }

    @PostMapping("/api/backoffice/applications/{applicationReference}/open-account")
    public OpenAccountResult openAccount(@PathVariable String applicationReference,
                                         @RequestBody Map<String, Object> payload,
                                         Authentication authentication,
                                         HttpServletRequest request) {
        return accountOpening.openAccount(
                authentication != null ? authentication.getName() : null,
                applicationReference,
                new OpenAccountCommand(
                        stringOrNull(payload.get("account_number")),
                        stringOrNull(payload.get("rib")),
                        stringOrNull(payload.get("opened_by")),
                        stringOrNull(payload.get("comment"))),
                HttpRequestMeta.clientIp(request),
                HttpRequestMeta.userAgent(request));
    }

    @GetMapping("/api/backoffice/applications/{applicationReference}/opened-account")
    public OpenedAccountView getOpenedAccount(@PathVariable String applicationReference) {
        return accountOpening.getOpenedAccount(applicationReference);
    }

    private static String stringOrNull(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
