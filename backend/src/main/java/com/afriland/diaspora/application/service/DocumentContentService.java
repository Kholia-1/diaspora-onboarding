package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.ReadDocumentUseCase;
import com.afriland.diaspora.application.port.out.DocumentCryptoPort;
import com.afriland.diaspora.application.port.out.DocumentRepositoryPort;
import com.afriland.diaspora.application.port.out.DocumentStoragePort;
import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class DocumentContentService implements ReadDocumentUseCase {

    private final DocumentRepositoryPort documents;
    private final DocumentStoragePort storage;
    private final DocumentCryptoPort crypto;

    public DocumentContentService(DocumentRepositoryPort documents, DocumentStoragePort storage,
                                  DocumentCryptoPort crypto) {
        this.documents = documents;
        this.storage = storage;
        this.crypto = crypto;
    }

    @Override
    public DocumentContent getDocumentContent(long documentId) {
        ApplicationDocumentInfo document = documents.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Document introuvable"));

        byte[] raw = storage.read(document.filePath())
                .orElseThrow(() -> ApiException.notFound("Fichier document introuvable"));

        // APPLICATION_DOCUMENT_CONTENT_PLAIN_OR_ENCRYPTED_V1
        // Fichiers .enc (upload classique chiffré) ou dont le contenu est un token Fernet : à déchiffrer.
        // Autres fichiers (copiés du pré-onboarding) : déjà en clair.
        String filePath = document.filePath() == null ? "" : document.filePath();
        boolean encrypted = filePath.toLowerCase(Locale.ROOT).endsWith(".enc") || crypto.looksEncrypted(raw);

        byte[] content;
        if (encrypted) {
            try {
                content = crypto.decrypt(raw);
            } catch (Exception e) {
                throw ApiException.internal("Impossible de déchiffrer le document");
            }
        } else {
            content = raw;
        }

        String mimeType = document.mimeType() == null || document.mimeType().isEmpty()
                ? "application/octet-stream"
                : document.mimeType();
        String filename = document.originalFilename() == null || document.originalFilename().isEmpty()
                ? "document"
                : document.originalFilename();

        return new DocumentContent(content, mimeType, filename);
    }
}
