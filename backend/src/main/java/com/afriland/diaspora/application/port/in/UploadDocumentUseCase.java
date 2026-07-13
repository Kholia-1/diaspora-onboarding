package com.afriland.diaspora.application.port.in;

import java.util.Map;

public interface UploadDocumentUseCase {

    /**
     * Charge un document pour un dossier : chiffrement Fernet + stockage .enc, création de la
     * ligne application_documents, recalcul du score documentaire et du statut.
     */
    Map<String, Object> upload(long applicationId, String documentType, String filename,
                               String contentType, byte[] content);
}
