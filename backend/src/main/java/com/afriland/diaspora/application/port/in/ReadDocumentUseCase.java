package com.afriland.diaspora.application.port.in;

import java.util.Map;

public interface ReadDocumentUseCase {

    /**
     * Lit le contenu d'un document (déchiffré si nécessaire).
     *
     * @throws com.afriland.diaspora.application.exception.ApiException 404 si document/fichier introuvable,
     *         500 si le déchiffrement échoue.
     */
    DocumentContent getDocumentContent(long documentId);

    /**
     * Lit et déchiffre l'analyse OCR d'un document ({@code <file_path>.analysis.enc}).
     * Structure de retour (parité GET /api/applications/documents/{id}/analysis) :
     * {@code {document_id, document_type, verification_status, quality_score, analysis}}.
     *
     * @throws com.afriland.diaspora.application.exception.ApiException 404 document/analyse
     *         introuvable, 400 type média sans analyse OCR, 500 si lecture/déchiffrement échoue.
     */
    Map<String, Object> getDocumentAnalysis(long documentId);

    record DocumentContent(byte[] content, String mimeType, String filename) {
    }
}
