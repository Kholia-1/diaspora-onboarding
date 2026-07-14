package com.afriland.diaspora.domain.service;

import java.util.Set;

/**
 * Règles d'orchestration de l'analyse documentaire — parité avec
 * {@code analyze_document_content} (app/services/document_auth_service.py, l.1191) :
 * types de documents soumis à l'OCR, aiguillage du matching et dérivation du
 * verification_status à partir du matching et de la qualité.
 *
 * <p><b>Divergence assumée</b> : le legacy pondère aussi
 * {@code document_type_validation} (détection de catégorie par mots-clés,
 * DOCUMENT_TYPE_MISMATCH). Cette validation n'est pas portée (hors périmètre de ce
 * lot, cf. volet A limité aux 5 fonctions de matching) ; la branche
 * DOCUMENT_TYPE_MISMATCH est donc omise dans {@link #deriveVerificationStatus}. Toutes
 * les autres transitions (QUALITY_REJECTED, REVIEW_REQUIRED, AUTHENTICATED, UPLOADED)
 * sont fidèles.
 */
public final class DocumentVerificationRules {

    /** Qualité neutre par défaut (parité NEUTRAL_QUALITY côté Java, OCR indisponible). */
    public static final int NEUTRAL_QUALITY_SCORE = 60;

    /** Types déclenchant l'OCR — parité stricte du set should_ocr de analyze_document_content. */
    private static final Set<String> OCR_DOCUMENT_TYPES = Set.of(
            "IDENTITY_DOCUMENT",
            "IDENTITY_DOCUMENT_PHOTO",
            "IDENTITY_DOCUMENT_RECTO",
            "IDENTITY_DOCUMENT_VERSO",
            "IDENTITY_DOCUMENT_IMPORTED",
            "IDENTITY_WITH_FILIATION",
            "BIRTH_CERTIFICATE_PHOTO",
            "CNI_RECTO",
            "CNI_VERSO",
            "PASSPORT_DOCUMENT",
            "PASSPORT_PHOTO",
            "ADDRESS_PROOF",
            "PROOF_OF_ADDRESS_PHOTO",
            "INCOME_PROOF",
            "EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO",
            "RIB_DOCUMENT",
            "TAX_COMPLIANCE_CERTIFICATE_PHOTO");

    /** Aiguillage du matching selon le type de document. */
    public enum MatchingRoute {
        IDENTITY,
        INCOME,
        RIB
    }

    private DocumentVerificationRules() {
    }

    /** Vrai si le type de document doit être passé à l'OCR (parité set should_ocr). */
    public static boolean shouldOcr(String documentType) {
        return documentType != null && OCR_DOCUMENT_TYPES.contains(documentType);
    }

    /**
     * Aiguillage : RIB_DOCUMENT → RIB, INCOME_PROOF → INCOME, tout le reste → IDENTITY
     * (parité de l'orchestration match_* de analyze_document_content).
     */
    public static MatchingRoute matchingRoute(String documentType) {
        if ("RIB_DOCUMENT".equals(documentType)) {
            return MatchingRoute.RIB;
        }
        if ("INCOME_PROOF".equals(documentType)) {
            return MatchingRoute.INCOME;
        }
        return MatchingRoute.IDENTITY;
    }

    /**
     * Dérive le verification_status — parité analyze_document_content (branche
     * document_type_validation exclue, voir en-tête de classe).
     */
    public static String deriveVerificationStatus(boolean shouldOcr, String matchStatus,
                                                  int matchScore, int qualityScore) {
        String status = matchStatus == null ? "" : matchStatus;

        if (qualityScore < 45) {
            return "QUALITY_REJECTED";
        }
        if (shouldOcr && (status.equals("MISMATCH") || status.equals("OCR_REVIEW_REQUIRED"))) {
            return "REVIEW_REQUIRED";
        }
        if (shouldOcr && (status.equals("MATCH_OK") || status.equals("PARTIAL_MATCH"))) {
            return matchScore >= 65 && qualityScore >= 65 ? "AUTHENTICATED" : "REVIEW_REQUIRED";
        }
        return "UPLOADED";
    }
}
