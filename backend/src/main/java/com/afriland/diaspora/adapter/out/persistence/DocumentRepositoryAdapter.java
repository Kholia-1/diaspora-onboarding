package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.DocumentRepositoryPort;
import com.afriland.diaspora.domain.model.ApplicationDocumentInfo;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

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
