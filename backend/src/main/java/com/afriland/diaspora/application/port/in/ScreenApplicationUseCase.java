package com.afriland.diaspora.application.port.in;

public interface ScreenApplicationUseCase {

    /**
     * Filtrage BLACKMODULE d'un dossier (fail-safe : jamais d'exception liée au
     * service externe, statuts neutres BLACKMODULE_UNAVAILABLE / BLACKMODULE_ERROR).
     */
    ScreeningOutcome screen(long applicationId);

    record ScreeningOutcome(
            String message,
            String applicationReference,
            String blackmoduleStatus,
            Double blackmoduleScore,
            String riskLevel,
            String alert,
            String newStatus) {
    }
}
