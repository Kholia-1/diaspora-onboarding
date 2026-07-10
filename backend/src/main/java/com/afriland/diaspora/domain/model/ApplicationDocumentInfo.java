package com.afriland.diaspora.domain.model;

import java.time.LocalDateTime;

/** Ligne brute de la table application_documents (avant règles de présentation back-office). */
public record ApplicationDocumentInfo(
        Long id,
        Long applicationId,
        String documentType,
        String originalFilename,
        String filePath,
        String mimeType,
        String sha256Hash,
        String verificationStatus,
        Double qualityScore,
        LocalDateTime createdAt) {
}
