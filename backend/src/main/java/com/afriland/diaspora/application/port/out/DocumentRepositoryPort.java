package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface DocumentRepositoryPort {

    List<ApplicationDocumentInfo> findByApplicationId(long applicationId);

    Optional<ApplicationDocumentInfo> findById(long id);

    /** Types de documents déjà présents pour un dossier. */
    Set<String> findDocumentTypesByApplicationId(long applicationId);

    ApplicationDocumentInfo save(ApplicationDocumentInfo document);
}
