package com.afriland.diaspora.domain.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class KycScoringTest {

    @Test
    void emptyProfileScoresZeroFloor() {
        // Aucun champ, non-PEP → +5 (bonus non-PEP) seulement.
        KycScoring.Profile empty = new KycScoring.Profile(
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, false);
        assertEquals(5, KycScoring.calculate(empty));
    }

    @Test
    void pepPenaltyCanReachFloorZero() {
        // Uniquement PEP=true, rien d'autre → -10 borné à 0.
        KycScoring.Profile pepOnly = new KycScoring.Profile(
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, true);
        assertEquals(0, KycScoring.calculate(pepOnly));
    }

    @Test
    void completeProfileCapsAt100() {
        KycScoring.Profile full = new KycScoring.Profile(
                "Jean", "Nguema",
                LocalDate.of(1990, 1, 15), "Yaoundé",
                "Mfoundi", "Ngo", "RESIDENT",
                "+237600000000", "jean@test.cm", "Bastos",
                "Paul", "+237611111111", "Marie", "+237622222222",
                "Père", "Mère", "Camerounaise", "Cameroun",
                "M", "CELIBATAIRE",
                "CNI123", LocalDate.of(2020, 5, 1), "Yaoundé",
                "COURANT", "Agence Centrale",
                "EPARGNE", "SALAIRE", "CM21RIB", false);
        // Somme = 10+10+5+5+5+10+10+10+5+10+10+5+15+10+10+5+5 = 155 → borné à 100.
        assertEquals(100, KycScoring.calculate(full));
    }

    @Test
    void partialProfileAddsExpectedPoints() {
        // Noms (+10), phone+email (+10), résidence status (+5), non-PEP (+5) = 30.
        KycScoring.Profile partial = new KycScoring.Profile(
                "Jean", "Nguema", null, null, null, null, "RESIDENT",
                "+237600000000", "jean@test.cm", null,
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, false);
        assertEquals(30, KycScoring.calculate(partial));
    }
}
