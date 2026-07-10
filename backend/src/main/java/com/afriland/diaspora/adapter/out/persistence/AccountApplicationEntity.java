package com.afriland.diaspora.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entité en lecture seule (Phase 1) sur la table account_applications.
 * Les noms de colonnes sont explicites pour coller au schéma existant
 * (notamment contact_person_1_name que la stratégie implicite traduirait mal).
 */
@Entity
@Table(name = "account_applications")
public class AccountApplicationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference")
    private String reference;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "birth_place")
    private String birthPlace;

    @Column(name = "birth_department")
    private String birthDepartment;

    @Column(name = "birth_name")
    private String birthName;

    @Column(name = "residency_status")
    private String residencyStatus;

    @Column(name = "address_location")
    private String addressLocation;

    @Column(name = "postal_box")
    private String postalBox;

    @Column(name = "phone")
    private String phone;

    @Column(name = "whatsapp_phone_full")
    private String whatsappPhoneFull;

    @Column(name = "whatsapp_otp_verified")
    private Boolean whatsappOtpVerified;

    @Column(name = "whatsapp_otp_verified_at")
    private LocalDateTime whatsappOtpVerifiedAt;

    @Column(name = "pre_onboarding_session_id")
    private String preOnboardingSessionId;

    @Column(name = "email")
    private String email;

    @Column(name = "contact_person_1_name")
    private String contactPerson1Name;

    @Column(name = "contact_person_1_phone")
    private String contactPerson1Phone;

    @Column(name = "contact_person_2_name")
    private String contactPerson2Name;

    @Column(name = "contact_person_2_phone")
    private String contactPerson2Phone;

    @Column(name = "father_name")
    private String fatherName;

    @Column(name = "mother_name")
    private String motherName;

    @Column(name = "nationality")
    private String nationality;

    @Column(name = "residence")
    private String residence;

    @Column(name = "sex")
    private String sex;

    @Column(name = "marital_status")
    private String maritalStatus;

    @Column(name = "matrimonial_regime")
    private String matrimonialRegime;

    @Column(name = "identity_document_number")
    private String identityDocumentNumber;

    @Column(name = "identity_document_issue_date")
    private LocalDate identityDocumentIssueDate;

    @Column(name = "identity_document_issue_place")
    private String identityDocumentIssuePlace;

    @Column(name = "rib")
    private String rib;

    @Column(name = "income_range")
    private String incomeRange;

    @Column(name = "income_currency")
    private String incomeCurrency;

    @Column(name = "activity_sector")
    private String activitySector;

    @Column(name = "activity_sector_code")
    private String activitySectorCode;

    @Column(name = "activity_subsector")
    private String activitySubsector;

    @Column(name = "activity_subsector_code")
    private String activitySubsectorCode;

    @Column(name = "account_object")
    private String accountObject;

    @Column(name = "account_object_other")
    private String accountObjectOther;

    @Column(name = "funds_origin")
    private String fundsOrigin;

    @Column(name = "funds_origin_other")
    private String fundsOriginOther;

    @Column(name = "account_type")
    private String accountType;

    @Column(name = "selected_package_code")
    private String selectedPackageCode;

    @Column(name = "selected_package_name")
    private String selectedPackageName;

    @Column(name = "selected_package_currency")
    private String selectedPackageCurrency;

    @Column(name = "selected_package_opening_fee")
    private BigDecimal selectedPackageOpeningFee;

    @Column(name = "selected_package_subscription_fee")
    private BigDecimal selectedPackageSubscriptionFee;

    @Column(name = "selected_package_monthly_fee")
    private BigDecimal selectedPackageMonthlyFee;

    @Column(name = "selected_package_payment_required")
    private Boolean selectedPackagePaymentRequired;

    @Column(name = "preferred_branch")
    private String preferredBranch;

    @Column(name = "account_purpose")
    private String accountPurpose;

    @Column(name = "is_pep")
    private Boolean isPep;

    @Column(name = "pep_details")
    private String pepDetails;

    @Column(name = "status")
    private String status;

    @Column(name = "client_message")
    private String clientMessage;

    @Column(name = "final_rib")
    private String finalRib;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "kyc_score")
    private Double kycScore;

    @Column(name = "document_score")
    private Double documentScore;

    @Column(name = "blackmodule_status")
    private String blackmoduleStatus;

    @Column(name = "blackmodule_score")
    private Double blackmoduleScore;

    @Column(name = "blackmodule_alert")
    private String blackmoduleAlert;

    @Column(name = "review_decision")
    private String reviewDecision;

    @Column(name = "review_comment")
    private String reviewComment;

    @Column(name = "package_payment_reference")
    private String packagePaymentReference;

    @Column(name = "package_payment_status")
    private String packagePaymentStatus;

    @Column(name = "package_payment_provider")
    private String packagePaymentProvider;

    @Column(name = "package_payment_amount")
    private BigDecimal packagePaymentAmount;

    @Column(name = "package_payment_currency")
    private String packagePaymentCurrency;

    @Column(name = "package_payment_url")
    private String packagePaymentUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    protected AccountApplicationEntity() {
    }

    public Long getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public String getLastName() {
        return lastName;
    }

    public String getFirstName() {
        return firstName;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public String getBirthPlace() {
        return birthPlace;
    }

    public String getBirthDepartment() {
        return birthDepartment;
    }

    public String getBirthName() {
        return birthName;
    }

    public String getResidencyStatus() {
        return residencyStatus;
    }

    public String getAddressLocation() {
        return addressLocation;
    }

    public String getPostalBox() {
        return postalBox;
    }

    public String getPhone() {
        return phone;
    }

    public String getWhatsappPhoneFull() {
        return whatsappPhoneFull;
    }

    public Boolean getWhatsappOtpVerified() {
        return whatsappOtpVerified;
    }

    public LocalDateTime getWhatsappOtpVerifiedAt() {
        return whatsappOtpVerifiedAt;
    }

    public String getPreOnboardingSessionId() {
        return preOnboardingSessionId;
    }

    public String getEmail() {
        return email;
    }

    public String getContactPerson1Name() {
        return contactPerson1Name;
    }

    public String getContactPerson1Phone() {
        return contactPerson1Phone;
    }

    public String getContactPerson2Name() {
        return contactPerson2Name;
    }

    public String getContactPerson2Phone() {
        return contactPerson2Phone;
    }

    public String getFatherName() {
        return fatherName;
    }

    public String getMotherName() {
        return motherName;
    }

    public String getNationality() {
        return nationality;
    }

    public String getResidence() {
        return residence;
    }

    public String getSex() {
        return sex;
    }

    public String getMaritalStatus() {
        return maritalStatus;
    }

    public String getMatrimonialRegime() {
        return matrimonialRegime;
    }

    public String getIdentityDocumentNumber() {
        return identityDocumentNumber;
    }

    public LocalDate getIdentityDocumentIssueDate() {
        return identityDocumentIssueDate;
    }

    public String getIdentityDocumentIssuePlace() {
        return identityDocumentIssuePlace;
    }

    public String getRib() {
        return rib;
    }

    public String getIncomeRange() {
        return incomeRange;
    }

    public String getIncomeCurrency() {
        return incomeCurrency;
    }

    public String getActivitySector() {
        return activitySector;
    }

    public String getActivitySectorCode() {
        return activitySectorCode;
    }

    public String getActivitySubsector() {
        return activitySubsector;
    }

    public String getActivitySubsectorCode() {
        return activitySubsectorCode;
    }

    public String getAccountObject() {
        return accountObject;
    }

    public String getAccountObjectOther() {
        return accountObjectOther;
    }

    public String getFundsOrigin() {
        return fundsOrigin;
    }

    public String getFundsOriginOther() {
        return fundsOriginOther;
    }

    public String getAccountType() {
        return accountType;
    }

    public String getSelectedPackageCode() {
        return selectedPackageCode;
    }

    public String getSelectedPackageName() {
        return selectedPackageName;
    }

    public String getSelectedPackageCurrency() {
        return selectedPackageCurrency;
    }

    public BigDecimal getSelectedPackageOpeningFee() {
        return selectedPackageOpeningFee;
    }

    public BigDecimal getSelectedPackageSubscriptionFee() {
        return selectedPackageSubscriptionFee;
    }

    public BigDecimal getSelectedPackageMonthlyFee() {
        return selectedPackageMonthlyFee;
    }

    public Boolean getSelectedPackagePaymentRequired() {
        return selectedPackagePaymentRequired;
    }

    public String getPreferredBranch() {
        return preferredBranch;
    }

    public String getAccountPurpose() {
        return accountPurpose;
    }

    public Boolean getIsPep() {
        return isPep;
    }

    public String getPepDetails() {
        return pepDetails;
    }

    public String getStatus() {
        return status;
    }

    public String getClientMessage() {
        return clientMessage;
    }

    public String getFinalRib() {
        return finalRib;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public Double getKycScore() {
        return kycScore;
    }

    public Double getDocumentScore() {
        return documentScore;
    }

    public String getBlackmoduleStatus() {
        return blackmoduleStatus;
    }

    public Double getBlackmoduleScore() {
        return blackmoduleScore;
    }

    public String getBlackmoduleAlert() {
        return blackmoduleAlert;
    }

    public String getReviewDecision() {
        return reviewDecision;
    }

    public String getReviewComment() {
        return reviewComment;
    }

    public String getPackagePaymentReference() {
        return packagePaymentReference;
    }

    public String getPackagePaymentStatus() {
        return packagePaymentStatus;
    }

    public String getPackagePaymentProvider() {
        return packagePaymentProvider;
    }

    public BigDecimal getPackagePaymentAmount() {
        return packagePaymentAmount;
    }

    public String getPackagePaymentCurrency() {
        return packagePaymentCurrency;
    }

    public String getPackagePaymentUrl() {
        return packagePaymentUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
