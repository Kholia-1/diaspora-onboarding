package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.ApplicationDetail;
import com.afriland.diaspora.domain.model.ApplicationStatusView;
import com.afriland.diaspora.domain.model.ApplicationSummary;
import com.afriland.diaspora.domain.model.NewApplication;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepositoryPort {

    /** Tous les dossiers, tri created_at desc. */
    List<ApplicationSummary> findAllSummaries();

    Optional<ApplicationDetail> findById(long id);

    Optional<ApplicationDetail> findByReference(String reference);

    Optional<ApplicationSummary> findSummaryById(long id);

    /** Crée un dossier (soumission client) et retourne sa vue liste (schéma ApplicationResponse). */
    ApplicationSummary create(NewApplication newApplication);

    /** Recalcule le score documentaire et met à jour le statut du dossier (upload de document). */
    void updateDocumentScoreAndStatus(long applicationId, int documentScore, String status);

    // --- Suivi client public ---

    /** Dossiers d'un email (comparaison insensible à la casse), tri created_at desc. */
    List<ApplicationStatusView> findStatusViewsByEmail(String email);

    /** Dossiers avec téléphone renseigné, tri created_at desc (filtrage par suffixe côté service). */
    List<ApplicationStatusView> findStatusViewsWithPhone();

    Optional<ApplicationStatusView> findStatusViewByReference(String reference);

    // --- Tableau de bord ---

    long countAll();

    long countByStatus(String status);

    // --- Mises à jour Phase 2 ---

    /** Applique une décision back-office : review_* + status = decision. */
    void applyDecision(long applicationId, String decision, String reviewedBy, String comment,
                       String clientMessage, String finalRib, String accountNumber, LocalDateTime reviewedAt);

    /** Applique le résultat d'un screening BLACKMODULE. */
    void applyScreening(long applicationId, String blackmoduleStatus, Double blackmoduleScore,
                        String blackmoduleAlert, String riskLevel, String newStatus);

    void updateStatus(long applicationId, String status);

    void updatePackagePaymentStatus(long applicationId, String packagePaymentStatus);

    // --- Mises à jour Phase 4 (paiement package) ---

    /**
     * Synchronise les champs de paiement package sur le dossier (parité sync_payment_to_application).
     * Met aussi à jour le statut du dossier si newApplicationStatus est fourni.
     */
    void syncPackagePayment(long applicationId, String paymentReference, String packagePaymentStatus,
                            String provider, java.math.BigDecimal amount, String currency, String paymentUrl,
                            String newApplicationStatus);

    /** Force le flag selected_package_payment_required (génération de lien back-office). */
    void markPackagePaymentRequired(long applicationId);
}
