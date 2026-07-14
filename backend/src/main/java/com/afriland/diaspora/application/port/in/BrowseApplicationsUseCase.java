package com.afriland.diaspora.application.port.in;

import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.ApplicationSummary;

import java.util.List;

public interface BrowseApplicationsUseCase {

    /** Liste des dossiers, tri created_at desc. */
    List<ApplicationSummary> listApplications();

    /** Détail d'un dossier par id numérique interne ou référence publique DIA-... */
    ApplicationWithDocuments getApplication(String idOrReference);

    record ApplicationWithDocuments(ApplicationDetail application, List<DocumentView> documents) {
    }

    /** Document affichable dans le back-office (dernier de chaque type, ordre métier). */
    record DocumentView(
            long id,
            String documentType,
            String documentLabel,
            String originalFilename,
            String mimeType,
            String verificationStatus,
            Double qualityScore,
            String sha256Hash,
            boolean video,
            boolean mediaOnly,
            boolean analysisAvailable) {
    }
}
