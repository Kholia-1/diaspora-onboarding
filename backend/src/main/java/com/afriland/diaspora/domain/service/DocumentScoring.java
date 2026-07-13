package com.afriland.diaspora.domain.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Score documentaire par familles de pièces — parité calculate_document_score.
 * Le score vérifie la présence d'au moins une pièce par groupe attendu.
 */
public final class DocumentScoring {

    private DocumentScoring() {
    }

    public static int calculate(String residencyStatus, boolean hasRib, Set<String> uploadedTypes) {
        List<Set<String>> requiredGroups = new ArrayList<>();
        requiredGroups.add(Set.of(
                "IDENTITY_DOCUMENT", "IDENTITY_DOCUMENT_PHOTO",
                "IDENTITY_DOCUMENT_RECTO", "IDENTITY_DOCUMENT_IMPORTED"));
        requiredGroups.add(Set.of("INCOME_PROOF"));
        requiredGroups.add(Set.of("SELFIE", "SELFIE_PHOTO", "SELFIE_VIDEO", "SELFIE_IMPORTED"));

        if (hasRib) {
            requiredGroups.add(Set.of("RIB_DOCUMENT"));
        }

        if ("NON_RESIDENT".equals(upper(residencyStatus))) {
            requiredGroups.add(Set.of("BIRTH_CERTIFICATE_PHOTO", "BIRTH_CERTIFICATE", "IDENTITY_WITH_FILIATION"));
            requiredGroups.add(Set.of("EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO", "EMPLOYMENT_OR_SCHOOL_CERTIFICATE"));
            requiredGroups.add(Set.of("TAX_COMPLIANCE_CERTIFICATE_PHOTO", "TAX_COMPLIANCE_CERTIFICATE"));
        }

        if (requiredGroups.isEmpty()) {
            return 0;
        }

        Set<String> uploaded = uploadedTypes == null ? Set.of() : uploadedTypes;
        int matched = 0;
        for (Set<String> group : requiredGroups) {
            if (group.stream().anyMatch(uploaded::contains)) {
                matched++;
            }
        }

        return (int) Math.round((matched / (double) requiredGroups.size()) * 100);
    }

    private static String upper(String value) {
        return value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
    }
}
