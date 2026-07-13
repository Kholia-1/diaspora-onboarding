package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.DocumentRepositoryPort;
import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DocumentRepositoryAdapter implements DocumentRepositoryPort {

    private final ApplicationDocumentJpaRepository repository;

    public DocumentRepositoryAdapter(ApplicationDocumentJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<ApplicationDocumentInfo> findByApplicationId(long applicationId) {
        return repository.findByApplicationId(applicationId).stream()
                .map(DocumentRepositoryAdapter::toDomain)
                .toList();
    }

    @Override
    public Optional<ApplicationDocumentInfo> findById(long id) {
        return repository.findById(id).map(DocumentRepositoryAdapter::toDomain);
    }

    @Override
    public Set<String> findDocumentTypesByApplicationId(long applicationId) {
        return repository.findByApplicationId(applicationId).stream()
                .map(ApplicationDocumentEntity::getDocumentType)
                .filter(type -> type != null && !type.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    public ApplicationDocumentInfo save(ApplicationDocumentInfo document) {
        ApplicationDocumentEntity entity = document.id() != null
                ? repository.findById(document.id()).orElseGet(ApplicationDocumentEntity::new)
                : new ApplicationDocumentEntity();

        entity.setApplicationId(document.applicationId());
        entity.setDocumentType(document.documentType());
        entity.setOriginalFilename(document.originalFilename());
        entity.setFilePath(document.filePath());
        entity.setMimeType(document.mimeType());
        entity.setSha256Hash(document.sha256Hash());
        entity.setVerificationStatus(document.verificationStatus());
        entity.setQualityScore(document.qualityScore());
        entity.setCreatedAt(document.createdAt());

        return toDomain(repository.save(entity));
    }

    private static ApplicationDocumentInfo toDomain(ApplicationDocumentEntity entity) {
        return new ApplicationDocumentInfo(
                entity.getId(),
                entity.getApplicationId(),
                entity.getDocumentType(),
                entity.getOriginalFilename(),
                entity.getFilePath(),
                entity.getMimeType(),
                entity.getSha256Hash(),
                entity.getVerificationStatus(),
                entity.getQualityScore(),
                entity.getCreatedAt());
    }
}
