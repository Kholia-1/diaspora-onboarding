package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;

import java.util.List;
import java.util.Optional;

public interface DocumentRepositoryPort {

    List<ApplicationDocumentInfo> findByApplicationId(long applicationId);

    Optional<ApplicationDocumentInfo> findById(long id);
}
