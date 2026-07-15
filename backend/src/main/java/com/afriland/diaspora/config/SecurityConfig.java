package com.afriland.diaspora.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           SecurityContextRepository securityContextRepository) throws Exception {
        http
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .cors(Customizer.withDefaults())
                // TODO transition : CSRF désactivé pour rester iso-comportement avec le monolithe
                // FastAPI (cookies de session sans token CSRF). À réactiver avec le nouveau front.
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/backoffice/auth/login", "/actuator/health").permitAll()
                        // Suivi client public (parité FastAPI : ces routes sont sans session).
                        .requestMatchers(
                                "/api/applications/status-by-email",
                                "/api/applications/status-by-contact",
                                "/api/applications/status/**",
                                "/api/applications/*/opened-account-public").permitAll()
                        // Soumission de dossier client : publique (le client soumet avant toute auth).
                        .requestMatchers(HttpMethod.POST, "/api/applications").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/applications/*/documents").permitAll()
                        // Lecture d'un dossier par id numérique : publique (parité FastAPI
                        // GET /api/applications/{id}). Le contrôleur contraint {id:\\d+}.
                        .requestMatchers(HttpMethod.GET, "/api/applications/*").permitAll()
                        // Référentiels du formulaire client : lecture publique uniquement
                        // (les écritures CRUD restent réservées au back-office, voir /api/** plus bas).
                        .requestMatchers(HttpMethod.GET,
                                "/api/sectors/active",
                                "/api/subsectors/active",
                                "/api/subsectors/by-sector/**",
                                "/api/subsectors/grouped",
                                "/api/packages/active",
                                "/api/agencies/active",
                                "/api/nationalities/active",
                                "/api/countries/active",
                                // Agences actives d'un pays : sélection d'agence côté client.
                                "/api/countries/*/agencies/active").permitAll()
                        // Pré-onboarding client : pré-authentification, endpoints publics.
                        .requestMatchers("/api/pre-onboarding/**").permitAll()
                        // Paiements Mastercard : checkout, webhook, retour, résumé — publics
                        // (le webhook et le retour Mastercard n'ont pas de session).
                        .requestMatchers("/api/payments/**").permitAll()
                        // Lien de paiement client : public, protégé par email/téléphone.
                        .requestMatchers("/api/client/payment-link/**").permitAll()
                        .requestMatchers("/api/backoffice/users/**").hasRole("ADMIN")
                        // Décision réservée aux rôles back-office métier (durcissement : le
                        // monolithe FastAPI acceptait toute session back-office).
                        .requestMatchers(HttpMethod.POST, "/api/backoffice/applications/*/decision")
                        .hasAnyRole("ADMIN", "GFC", "DA", "CONFORMITE")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().authenticated())
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(jsonAuthenticationEntryPoint())
                        .accessDeniedHandler(jsonAccessDeniedHandler()));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                // union-portal Angular : shell (host) + remotes promote/diaspora en dev.
                "http://localhost:4200",
                "http://localhost:4201",
                "http://localhost:4202",
                "https://onboarding.afb-firstagent.com"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /** 401 JSON {"detail": "..."} — parité messages FastAPI selon la route. */
    private static AuthenticationEntryPoint jsonAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            String path = request.getRequestURI();
            String detail = "Non authentifié.";
            if (path.startsWith("/api/backoffice/")
                    && !path.startsWith("/api/backoffice/auth")
                    && !path.startsWith("/api/backoffice/users")) {
                detail = "Authentification back-office requise.";
            }
            writeDetail(response, 401, detail);
        };
    }

    /** 403 JSON — parité "Accès réservé au rôle : ..." (rôles triés, comme le guard Python). */
    private static AccessDeniedHandler jsonAccessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            String path = request.getRequestURI();
            String detail = path.startsWith("/api/backoffice/applications/") && path.endsWith("/decision")
                    ? "Accès réservé au rôle : ADMIN, CONFORMITE, DA, GFC."
                    : "Accès réservé au rôle : ADMIN.";
            writeDetail(response, 403, detail);
        };
    }

    private static void writeDetail(HttpServletResponse response, int status, String detail) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"detail\":\"" + detail.replace("\"", "\\\"") + "\"}");
    }
}
