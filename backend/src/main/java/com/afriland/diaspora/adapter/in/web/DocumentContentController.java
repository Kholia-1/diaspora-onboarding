package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.port.in.ReadDocumentUseCase;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DocumentContentController {

    private final ReadDocumentUseCase readDocument;

    public DocumentContentController(ReadDocumentUseCase readDocument) {
        this.readDocument = readDocument;
    }

    @GetMapping("/api/applications/documents/{documentId}/content")
    public ResponseEntity<byte[]> getDocumentContent(@PathVariable long documentId) {
        var document = readDocument.getDocumentContent(documentId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, document.mimeType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + document.filename() + "\"")
                .body(document.content());
    }

    /**
     * Analyse OCR d'un document (authentifié back-office, sous /api/** protégé).
     * Lit et déchiffre {@code <file_path>.analysis.enc} — 404 si absent, 400 pour un
     * type média sans OCR. Parité GET /documents/{document_id}/analysis (FastAPI).
     */
    @GetMapping("/api/applications/documents/{documentId}/analysis")
    public Map<String, Object> getDocumentAnalysis(@PathVariable long documentId) {
        return readDocument.getDocumentAnalysis(documentId);
    }
}
