package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.ScreenApplicationUseCase;
import com.afriland.diaspora.application.port.in.SubmitApplicationUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.AuditPort;
import com.afriland.diaspora.application.port.out.NotificationPort;
import com.afriland.diaspora.domain.model.ApplicationSummary;
import com.afriland.diaspora.domain.model.NewApplication;
import com.afriland.diaspora.domain.service.ApplicationReferenceGenerator;
import com.afriland.diaspora.domain.service.KycScoring;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class SubmitApplicationService implements SubmitApplicationUseCase {

    private static final Logger log = LoggerFactory.getLogger(SubmitApplicationService.class);

    private final ApplicationRepositoryPort applications;
    private final ScreenApplicationUseCase screening;
    private final NotificationPort notifications;
    private final AuditPort audit;

    public SubmitApplicationService(ApplicationRepositoryPort applications, ScreenApplicationUseCase screening,
                                    NotificationPort notifications, AuditPort audit) {
        this.applications = applications;
        this.screening = screening;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Override
    @Transactional
    public ApplicationSummary submit(SubmitCommand c, String ipAddress, String userAgent) {
        if (isBlank(c.lastName()) || isBlank(c.firstName())) {
            throw ApiException.badRequest("Le nom et le prénom sont obligatoires.");
        }
        if (isBlank(c.email())) {
            throw ApiException.badRequest("L'adresse email est obligatoire.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String residency = firstNonBlank(c.residencyStatus(), "RESIDENT");
        String lastName = c.lastName().toUpperCase(Locale.ROOT);
        String firstName = c.firstName().toUpperCase(Locale.ROOT);
        String activitySector = firstNonBlank(c.activitySector(),
                firstNonBlank(c.sectorOfActivity(), c.economicSector()));

        boolean whatsappVerified = Boolean.TRUE.equals(c.whatsappOtpVerified());
        LocalDateTime whatsappVerifiedAt = c.whatsappOtpVerifiedAt() != null
                ? c.whatsappOtpVerifiedAt()
                : (whatsappVerified ? now : null);
        String whatsappPhoneFull = firstNonBlank(c.whatsappPhoneFull(), c.phone());

        boolean isPep = Boolean.TRUE.equals(c.isPep());

        int kyc = KycScoring.calculate(new KycScoring.Profile(
                firstName, lastName, c.birthDate(), c.birthPlace(), c.birthDepartment(), c.birthName(),
                residency, c.phone(), c.email(), c.addressLocation(),
                c.contactPerson1Name(), c.contactPerson1Phone(), c.contactPerson2Name(), c.contactPerson2Phone(),
                c.fatherName(), c.motherName(), c.nationality(), c.residence(), c.sex(), c.maritalStatus(),
                c.identityDocumentNumber(), c.identityDocumentIssueDate(), c.identityDocumentIssuePlace(),
                c.accountType(), c.preferredBranch(), c.accountObject(), c.fundsOrigin(), c.rib(), isPep));

        NewApplication newApplication = new NewApplication(
                ApplicationReferenceGenerator.generate(),
                lastName, firstName, c.birthDate(), c.birthPlace(), c.birthDepartment(), c.birthName(), residency,
                c.addressLocation(), c.postalBox(), c.phone(), c.email(),
                emptyToNull(c.preOnboardingSessionId()), whatsappPhoneFull, whatsappVerified, whatsappVerifiedAt,
                c.contactPerson1Name(), c.contactPerson1Phone(), c.contactPerson2Name(), c.contactPerson2Phone(),
                c.fatherName(), c.motherName(), c.nationality(), c.residence(), c.sex(), c.maritalStatus(),
                c.matrimonialRegime(), c.identityDocumentNumber(), c.identityDocumentIssueDate(),
                c.identityDocumentIssuePlace(), c.rib(), c.incomeRange(), c.incomeCurrency(), activitySector,
                c.activitySectorCode(), c.activitySubsector(), c.activitySubsectorCode(),
                c.accountObject(), c.accountObjectOther(), c.fundsOrigin(), c.fundsOriginOther(),
                c.accountType(), c.preferredBranch(),
                c.selectedPackageCode(), c.selectedPackageName(), c.selectedPackageCurrency(),
                toBigDecimal(c.selectedPackageOpeningFee()), toBigDecimal(c.selectedPackageSubscriptionFee()),
                toBigDecimal(c.selectedPackageMonthlyFee()),
                Boolean.valueOf(Boolean.TRUE.equals(c.selectedPackagePaymentRequired())),
                c.accountPurpose(), isPep, c.pepDetails(),
                "SUBMITTED", (double) kyc, now);

        ApplicationSummary created = applications.create(newApplication);

        audit.log(created.email(), "APPLICATION_SUBMITTED", "AccountApplication", created.reference(),
                "{\"account_type\": " + json(created.accountType())
                        + ", \"preferred_branch\": " + json(created.preferredBranch()) + "}",
                ipAddress, userAgent);

        // Best-effort : screening BLACKMODULE (peut faire évoluer le statut).
        try {
            screening.screen(created.id());
        } catch (Exception e) {
            log.warn("[APPLICATION_SUBMITTED] screening indisponible pour {} : {}",
                    created.reference(), e.getMessage());
        }

        // Best-effort : accusé de réception WhatsApp (DOSSIER_SOUMIS).
        try {
            if (!isBlank(created.phone())) {
                Map<String, Object> ctx = new LinkedHashMap<>();
                ctx.put("full_name", (firstName + " " + lastName).strip());
                ctx.put("reference", created.reference());
                ctx.put("application_reference", created.reference());
                notifications.sendEvent(created.phone(), "DOSSIER_SOUMIS", ctx);
            }
        } catch (Exception e) {
            log.warn("[APPLICATION_SUBMITTED] notification indisponible pour {} : {}",
                    created.reference(), e.getMessage());
        }

        // Renvoie l'état à jour (le screening a pu modifier le statut / les scores).
        return applications.findSummaryById(created.id()).orElse(created);
    }

    private static BigDecimal toBigDecimal(Double value) {
        return BigDecimal.valueOf(value == null ? 0.0 : value);
    }

    private static String json(String value) {
        return value == null ? "null" : "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return b == null || b.isBlank() ? null : b;
    }
}
