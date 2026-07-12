package com.afriland.diaspora.application.port.in;

public interface DashboardUseCase {

    /** Compteurs du tableau de bord back-office — parité GET /api/backoffice/dashboard/summary. */
    DashboardSummary summary();

    record DashboardSummary(
            long totalDemandes,
            long demandesSoumises,
            long alertesBlackmodule,
            long revueConformite,
            long dossiersApprouves,
            long dossiersRejetes,
            long comptesOuverts) {
    }
}
