package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Screening externe BLACKMODULE. Fail-safe : ne lève JAMAIS d'exception ; en cas
 * d'indisponibilité, retourne un résultat neutre (BLACKMODULE_UNAVAILABLE / A_VERIFIER).
 */
public interface ScreeningPort {

    ScreeningResult screen(Map<String, Object> payload);

    record ScreeningResult(String status, Double score, String riskLevel, String alert) {
    }
}
