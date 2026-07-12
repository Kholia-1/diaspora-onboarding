package com.afriland.diaspora.adapter.out.persistence;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.ApplicationStatusView;
import com.afriland.diaspora.domain.model.ApplicationSummary;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class ApplicationRepositoryAdapter implements ApplicationRepositoryPort {

    private final AccountApplicationJpaRepository repository;

    public ApplicationRepositoryAdapter(AccountApplicationJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<ApplicationSummary> findAllSummaries() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(ApplicationRepositoryAdapter::toSummary)
                .toList();
    }

    @Override
    public Optional<ApplicationDetail> findById(long id) {
        return repository.findById(id).map(ApplicationRepositoryAdapter::toDetail);
    }

    @Override
    public Optional<ApplicationDetail> findByReference(String reference) {
        return repository.findByReference(reference).map(ApplicationRepositoryAdapter::toDetail);
    }

    @Override
    public List<ApplicationStatusView> findStatusViewsByEmail(String email) {
        return repository.findByEmailIgnoreCaseOrderByCreatedAtDesc(email).stream()
                .map(ApplicationRepositoryAdapter::toStatusView)
                .toList();
    }

    @Override
    public List<ApplicationStatusView> findStatusViewsWithPhone() {
        return repository.findByPhoneIsNotNullOrderByCreatedAtDesc().stream()
                .map(ApplicationRepositoryAdapter::toStatusView)
                .toList();
    }

    @Override
    public Optional<ApplicationStatusView> findStatusViewByReference(String reference) {
        return repository.findByReference(reference).map(ApplicationRepositoryAdapter::toStatusView);
    }

    @Override
    public long countAll() {
        return repository.count();
    }

    @Override
    public long countByStatus(String status) {
        return repository.countByStatus(status);
    }

    @Override
    public void applyDecision(long applicationId, String decision, String reviewedBy, String comment,
                              String clientMessage, String finalRib, String accountNumber,
                              LocalDateTime reviewedAt) {
        AccountApplicationEntity entity = requireEntity(applicationId);
        entity.setReviewDecision(decision);
        entity.setReviewedBy(reviewedBy);
        entity.setReviewComment(comment);
        entity.setClientMessage(clientMessage);
        entity.setFinalRib(finalRib);
        entity.setAccountNumber(accountNumber);
        entity.setReviewedAt(reviewedAt);
        entity.setStatus(decision);
        repository.save(entity);
    }

    @Override
    public void applyScreening(long applicationId, String blackmoduleStatus, Double blackmoduleScore,
                               String blackmoduleAlert, String riskLevel, String newStatus) {
        AccountApplicationEntity entity = requireEntity(applicationId);
        entity.setBlackmoduleStatus(blackmoduleStatus);
        entity.setBlackmoduleScore(blackmoduleScore);
        entity.setBlackmoduleAlert(blackmoduleAlert);
        entity.setRiskLevel(riskLevel);
        entity.setStatus(newStatus);
        repository.save(entity);
    }

    @Override
    public void updateStatus(long applicationId, String status) {
        AccountApplicationEntity entity = requireEntity(applicationId);
        entity.setStatus(status);
        repository.save(entity);
    }

    @Override
    public void updatePackagePaymentStatus(long applicationId, String packagePaymentStatus) {
        AccountApplicationEntity entity = requireEntity(applicationId);
        entity.setPackagePaymentStatus(packagePaymentStatus);
        repository.save(entity);
    }

    private AccountApplicationEntity requireEntity(long applicationId) {
        return repository.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Demande introuvable"));
    }

    private static ApplicationStatusView toStatusView(AccountApplicationEntity e) {
        return new ApplicationStatusView(
                e.getId(),
                e.getReference(),
                e.getLastName(),
                e.getFirstName(),
                e.getEmail(),
                e.getPhone(),
                e.getPreferredBranch(),
                e.getNationality(),
                e.getResidencyStatus(),
                e.getStatus(),
                e.getRiskLevel(),
                e.getKycScore(),
                e.getDocumentScore(),
                e.getBlackmoduleStatus(),
                e.getCreatedAt(),
                e.getReviewDecision(),
                e.getReviewComment(),
                e.getClientMessage(),
                e.getFinalRib(),
                e.getAccountNumber(),
                e.getRib(),
                e.getSelectedPackageCode(),
                e.getSelectedPackageName(),
                e.getSelectedPackageCurrency(),
                e.getSelectedPackageOpeningFee(),
                e.getSelectedPackageSubscriptionFee(),
                e.getSelectedPackageMonthlyFee(),
                e.getSelectedPackagePaymentRequired(),
                e.getPackagePaymentReference(),
                e.getPackagePaymentStatus(),
                e.getPackagePaymentProvider(),
                e.getPackagePaymentAmount(),
                e.getPackagePaymentCurrency(),
                e.getPackagePaymentUrl());
    }

    private static ApplicationSummary toSummary(AccountApplicationEntity e) {
        return new ApplicationSummary(
                e.getId(),
                e.getReference(),
                e.getLastName(),
                e.getFirstName(),
                e.getBirthDate(),
                e.getBirthPlace(),
                e.getBirthDepartment(),
                e.getAddressLocation(),
                e.getPostalBox(),
                e.getPhone(),
                e.getWhatsappPhoneFull(),
                e.getWhatsappOtpVerified(),
                e.getWhatsappOtpVerifiedAt(),
                e.getPreOnboardingSessionId(),
                e.getEmail(),
                e.getContactPerson1Name(),
                e.getContactPerson1Phone(),
                e.getContactPerson2Name(),
                e.getContactPerson2Phone(),
                e.getFatherName(),
                e.getMotherName(),
                e.getNationality(),
                e.getResidence(),
                e.getSex(),
                e.getMaritalStatus(),
                e.getMatrimonialRegime(),
                e.getIdentityDocumentNumber(),
                e.getIdentityDocumentIssueDate(),
                e.getIdentityDocumentIssuePlace(),
                e.getAccountType(),
                e.getPreferredBranch(),
                e.getAccountPurpose(),
                e.getIsPep(),
                e.getPepDetails(),
                e.getStatus(),
                e.getRiskLevel(),
                e.getKycScore(),
                e.getDocumentScore(),
                e.getBlackmoduleStatus(),
                e.getBlackmoduleScore(),
                e.getBlackmoduleAlert(),
                e.getCreatedAt());
    }

    private static ApplicationDetail toDetail(AccountApplicationEntity e) {
        return new ApplicationDetail(
                e.getId(),
                e.getReference(),
                e.getLastName(),
                e.getFirstName(),
                e.getBirthDate(),
                e.getBirthPlace(),
                e.getBirthDepartment(),
                e.getBirthName(),
                e.getResidencyStatus(),
                e.getAddressLocation(),
                e.getPostalBox(),
                e.getPhone(),
                e.getEmail(),
                e.getContactPerson1Name(),
                e.getContactPerson1Phone(),
                e.getContactPerson2Name(),
                e.getContactPerson2Phone(),
                e.getFatherName(),
                e.getMotherName(),
                e.getNationality(),
                e.getResidence(),
                e.getSex(),
                e.getMaritalStatus(),
                e.getMatrimonialRegime(),
                e.getIdentityDocumentNumber(),
                e.getIdentityDocumentIssueDate(),
                e.getIdentityDocumentIssuePlace(),
                e.getRib(),
                e.getIncomeRange(),
                e.getIncomeCurrency(),
                e.getActivitySector(),
                e.getActivitySectorCode(),
                e.getActivitySubsector(),
                e.getActivitySubsectorCode(),
                e.getAccountObject(),
                e.getAccountObjectOther(),
                e.getFundsOrigin(),
                e.getFundsOriginOther(),
                e.getAccountType(),
                e.getSelectedPackageCode(),
                e.getSelectedPackageName(),
                e.getSelectedPackageCurrency(),
                e.getSelectedPackageOpeningFee(),
                e.getSelectedPackageSubscriptionFee(),
                e.getSelectedPackageMonthlyFee(),
                e.getSelectedPackagePaymentRequired(),
                e.getPreferredBranch(),
                e.getAccountPurpose(),
                e.getIsPep(),
                e.getPepDetails(),
                e.getStatus(),
                e.getClientMessage(),
                e.getFinalRib(),
                e.getAccountNumber(),
                e.getRiskLevel(),
                e.getKycScore(),
                e.getDocumentScore(),
                e.getBlackmoduleStatus(),
                e.getBlackmoduleScore(),
                e.getBlackmoduleAlert(),
                e.getReviewDecision(),
                e.getReviewComment(),
                e.getPackagePaymentReference(),
                e.getPackagePaymentStatus(),
                e.getPackagePaymentProvider(),
                e.getPackagePaymentAmount(),
                e.getPackagePaymentCurrency(),
                e.getPackagePaymentUrl());
    }
}
