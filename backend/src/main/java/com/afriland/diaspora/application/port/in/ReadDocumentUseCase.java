package com.afriland.diaspora.application.port.in;

public interface ReadDocumentUseCase {

    /**
     * Lit le contenu d'un document (déchiffré si nécessaire).
     *
     * @throws com.afriland.diaspora.application.exception.ApiException 404 si document/fichier introuvable,
     *         500 si le déchiffrement échoue.
     */
    DocumentContent getDocumentContent(long documentId);

    record DocumentContent(byte[] content, String mimeType, String filename) {
    }
}
