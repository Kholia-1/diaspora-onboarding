package com.afriland.diaspora.adapter.in.web.security;

import com.afriland.diaspora.adapter.in.web.HttpRequestMeta;
import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.AuthenticateUserUseCase;
import com.afriland.diaspora.domain.model.BackofficeUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backoffice/auth")
public class BackofficeAuthController {

    private final AuthenticateUserUseCase auth;
    private final SecurityContextRepository securityContextRepository;

    public BackofficeAuthController(AuthenticateUserUseCase auth,
                                    SecurityContextRepository securityContextRepository) {
        this.auth = auth;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody Map<String, Object> payload,
                              HttpServletRequest request, HttpServletResponse response) {
        String username = stringValue(payload.get("username"));
        String password = stringValue(payload.get("password"));

        BackofficeUser user = auth.login(username, password,
                HttpRequestMeta.clientIp(request), HttpRequestMeta.userAgent(request));

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                user.username(), null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.role())));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        // Index Spring Session par nom de principal : permet l'invalidation ciblée
        // des sessions d'un utilisateur (désactivation / reset de mot de passe).
        request.getSession(true).setAttribute(
                FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, user.username());

        return new AuthResponse(true, UserPayload.from(user));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            auth.logout(authentication.getName(),
                    HttpRequestMeta.clientIp(request), HttpRequestMeta.userAgent(request));
        }

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();

        return Map.of("ok", true);
    }

    @GetMapping("/me")
    public AuthResponse me(Authentication authentication) {
        if (authentication == null) {
            throw ApiException.unauthorized("Non authentifié.");
        }

        BackofficeUser user = auth.findActiveUser(authentication.getName())
                .orElseThrow(() -> ApiException.unauthorized("Non authentifié."));

        return new AuthResponse(true, UserPayload.from(user));
    }

    private static String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    public record AuthResponse(boolean ok, UserPayload user) {
    }

    public record UserPayload(String username, String fullName, String role) {

        static UserPayload from(BackofficeUser user) {
            return new UserPayload(user.username(), user.fullName(), user.role());
        }
    }
}
