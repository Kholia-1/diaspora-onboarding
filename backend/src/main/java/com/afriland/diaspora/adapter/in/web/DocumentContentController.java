package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.port.in.ReadDocumentUseCase;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

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
}
