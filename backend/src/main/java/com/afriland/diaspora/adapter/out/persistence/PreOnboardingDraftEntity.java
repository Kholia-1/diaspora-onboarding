package com.afriland.diaspora.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Table pre_onboarding_drafts (Flyway V3) : brouillon de formulaire pour la
 * reprise de dossier. Les champs saisis sont stockés en JSON (fields_json).
 */
@Entity
@Table(name = "pre_onboarding_drafts")
public class PreOnboardingDraftEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "draft_id", nullable = false, length = 120)
    private String draftId;

    @Column(length = 255)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(name = "account_type", length = 30)
    private String accountType;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "fields_json", columnDefinition = "TEXT")
    private String fieldsJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDraftId() { return draftId; }
    public void setDraftId(String draftId) { this.draftId = draftId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getFieldsJson() { return fieldsJson; }
    public void setFieldsJson(String fieldsJson) { this.fieldsJson = fieldsJson; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
