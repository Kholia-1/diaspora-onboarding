package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.port.out.DraftStorePort;
import com.afriland.diaspora.domain.model.PreOnboardingDraft;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class DraftStoreAdapter implements DraftStorePort {

    private final PreOnboardingDraftJpaRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    public DraftStoreAdapter(PreOnboardingDraftJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<PreOnboardingDraft> findByDraftId(String draftId) {
        return repository.findByDraftId(draftId).map(this::toDomain);
    }

    @Override
    public PreOnboardingDraft save(PreOnboardingDraft draft) {
        PreOnboardingDraftEntity entity = repository.findByDraftId(draft.draftId())
                .orElseGet(PreOnboardingDraftEntity::new);

        entity.setDraftId(draft.draftId());
        entity.setEmail(draft.email());
        entity.setPhone(draft.phone());
        entity.setAccountType(draft.accountType());
        entity.setStatus(draft.status());
        entity.setStage(draft.stage() == null || draft.stage().isBlank()
                ? PreOnboardingDraft.STAGE_DOCUMENTS : draft.stage());
        entity.setFieldsJson(writeFields(draft.fields()));
        entity.setCreatedAt(draft.createdAt());
        entity.setUpdatedAt(draft.updatedAt());

        return toDomain(repository.save(entity));
    }

    @Override
    public List<PreOnboardingDraft> searchInProgressByEmail(String email) {
        return repository
                .findTop5ByStatusAndEmailIgnoreCaseOrderByUpdatedAtDesc(PreOnboardingDraft.STATUS_IN_PROGRESS, email)
                .stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public List<PreOnboardingDraft> searchInProgressByPhoneSuffix(String phoneDigitsSuffix) {
        return repository
                .findByStatusAndPhoneEndingWith(PreOnboardingDraft.STATUS_IN_PROGRESS, phoneDigitsSuffix)
                .stream()
                .limit(5)
                .map(this::toDomain)
                .toList();
    }

    private PreOnboardingDraft toDomain(PreOnboardingDraftEntity entity) {
        return new PreOnboardingDraft(
                entity.getId(),
                entity.getDraftId(),
                entity.getEmail(),
                entity.getPhone(),
                entity.getAccountType(),
                entity.getStatus(),
                entity.getStage() == null ? PreOnboardingDraft.STAGE_DOCUMENTS : entity.getStage(),
                readFields(entity.getFieldsJson()),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private String writeFields(Map<String, String> fields) {
        try {
            return mapper.writeValueAsString(fields == null ? Map.of() : fields);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, String> readFields(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return mapper.readValue(json, new TypeReference<LinkedHashMap<String, String>>() { });
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }
}
