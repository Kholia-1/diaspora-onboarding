package com.afriland.diaspora.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "application_documents")
public class ApplicationDocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "document_type", nullable = false, length = 100)
    private String documentType;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "sha256_hash", length = 128)
    private String sha256Hash;

    @Column(name = "verification_status", length = 60)
    private String verificationStatus;

    @Column(name = "quality_score")
    private Double qualityScore;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    protected ApplicationDocumentEntity() {
    }

    public Long getId() {
        return id;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public String getDocumentType() {
        return documentType;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getFilePath() {
        return filePath;
    }

    public String getMimeType() {
        return mimeType;
    }

    public String getSha256Hash() {
        return sha256Hash;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public Double getQualityScore() {
        return qualityScore;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
