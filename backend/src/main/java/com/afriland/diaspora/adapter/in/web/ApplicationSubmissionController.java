package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.adapter.in.web.backoffice.ApplicationSummaryDto;
import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.SubmitApplicationUseCase;
import com.afriland.diaspora.application.port.in.SubmitApplicationUseCase.SubmitCommand;
import com.afriland.diaspora.application.port.in.UploadDocumentUseCase;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Soumission de dossier client — endpoints PUBLICS (le client soumet avant toute auth).
 * Parité app/routers/applications.py (POST "" création, POST /{id}/documents upload).
 */
@RestController
@RequestMapping("/api/applications")
public class ApplicationSubmissionController {

    private final SubmitApplicationUseCase submitApplication;
    private final UploadDocumentUseCase uploadDocument;

    public ApplicationSubmissionController(SubmitApplicationUseCase submitApplication,
                                           UploadDocumentUseCase uploadDocument) {
        this.submitApplication = submitApplication;
        this.uploadDocument = uploadDocument;
    }

    @PostMapping
    public ApplicationSummaryDto createApplication(@RequestBody SubmitCommand command,
                                                   HttpServletRequest request) {
        if (command == null) {
            throw ApiException.badRequest("Corps de requête manquant.");
        }
        return ApplicationSummaryDto.from(submitApplication.submit(
                command, HttpRequestMeta.clientIp(request), HttpRequestMeta.userAgent(request)));
    }

    @PostMapping("/{applicationId}/documents")
    public Map<String, Object> uploadDocument(@PathVariable long applicationId,
                                              @RequestParam("document_type") String documentType,
                                              @RequestParam("file") MultipartFile file) {
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw ApiException.badRequest("Fichier illisible.");
        }
        return uploadDocument.upload(applicationId, documentType,
                file.getOriginalFilename(), file.getContentType(), content);
    }
}
