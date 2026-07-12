package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.ScreenApplicationUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.application.port.out.ScreeningPort;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.service.ScreeningRules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ScreeningService implements ScreenApplicationUseCase {

    private final ApplicationRepositoryPort applications;
    private final ScreeningPort screening;

    public ScreeningService(ApplicationRepositoryPort applications, ScreeningPort screening) {
        this.applications = applications;
        this.screening = screening;
    }

    @Override
    @Transactional
    public ScreeningOutcome screen(long applicationId) {
        ApplicationDetail application = applications.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Demande introuvable"));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("nom", application.lastName());
        payload.put("prenom", application.firstName());
        payload.put("date_naissance",
                application.birthDate() != null ? application.birthDate().toString() : null);
        payload.put("lieu_naissance", application.birthPlace());
        payload.put("nationalite", application.nationality());
        payload.put("residence", application.residence());
        payload.put("numero_piece", application.identityDocumentNumber());
        payload.put("type_client", "PERSONNE_PHYSIQUE");
        payload.put("source", "DIASPORA_ONBOARDING");
        payload.put("reference_dossier", application.reference());

        ScreeningPort.ScreeningResult result = screening.screen(payload);

        String newStatus = ScreeningRules.nextApplicationStatus(
                result.status(), application.kycScore(), application.documentScore());

        applications.applyScreening(
                applicationId,
                result.status(),
                result.score(),
                result.alert(),
                result.riskLevel(),
                newStatus);

        return new ScreeningOutcome(
                "Filtrage BLACKMODULE terminé",
                application.reference(),
                result.status(),
                result.score(),
                result.riskLevel(),
                result.alert(),
                newStatus);
    }
}
