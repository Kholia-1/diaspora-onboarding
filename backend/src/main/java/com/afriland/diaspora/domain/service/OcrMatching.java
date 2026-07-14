package com.afriland.diaspora.domain.service;

import java.text.Normalizer;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rapprochement OCR ↔ dossier — port fidèle des fonctions de matching du monolithe
 * FastAPI (app/services/document_auth_service.py) : normalize_for_match (l.124),
 * match_date_in_ocr (l.327), match_ocr_with_application (l.340),
 * match_rib_with_application (l.413), match_income_document (l.471).
 *
 * <p>Java pur, aucune dépendance Spring. Les structures retournées ({@link Map} à
 * ordre d'insertion, {@link List}) reproduisent à l'identique les dicts Python afin
 * que la sérialisation JSON snake_case soit iso-legacy.
 *
 * <p><b>Similarité de chaînes</b> — le legacy s'appuie sur
 * {@code difflib.SequenceMatcher(None, a, b).ratio()}. On porte l'algorithme exact
 * de difflib (Ratcliff/Obershelp : {@code ratio = 2*M/T}, M = nombre total de
 * caractères appariés par recherche récursive du plus long bloc commun, T = |a|+|b|),
 * et non une distance de Levenshtein normalisée : c'est la seule façon d'obtenir les
 * mêmes valeurs aux seuils repris du legacy. L'heuristique « autojunk » de difflib ne
 * se déclenche jamais ici (elle exige {@code len(b) > 200}) : nos chaînes (noms, RIB)
 * sont courtes, l'implémentation est donc identique bit à bit sur ces entrées.
 *
 * <p><b>Seuils repris du legacy</b> :
 * <ul>
 *   <li>fuzzy_contains noms : ratio ≥ 0.78 ; numéro de pièce : ratio ≥ 0.72 ;</li>
 *   <li>score identité → statut : ≥ 65 MATCH_OK, ≥ 35 PARTIAL_MATCH, sinon MISMATCH ;</li>
 *   <li>RIB : sous-chaîne exacte = 100, sinon int(ratio*100) ; ≥ 90 MATCH_OK,
 *       ≥ 65 PARTIAL_MATCH, sinon MISMATCH ;</li>
 *   <li>revenu : présence d'un mot-clé = 70, sinon 40 si texte &gt; 30 caractères, sinon 0 ;
 *       score ≥ 60 PARTIAL_MATCH sinon OCR_REVIEW_REQUIRED.</li>
 * </ul>
 */
public final class OcrMatching {

    private static final Pattern NON_ALNUM = Pattern.compile("[^A-Z0-9]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{Mn}");
    private static final Pattern NON_DIGIT = Pattern.compile("\\D+");
    private static final Pattern ISO_DATE = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})");
    // Parité r"[0-9][0-9\s\-\.]{5,}[0-9]" : suites de chiffres (avec espaces/tirets/points).
    private static final Pattern RIB_NUMBER = Pattern.compile("[0-9][0-9\\s\\-.]{5,}[0-9]");

    /** Mots-clés justificatif de revenu — ordre et casse identiques au legacy. */
    private static final List<String> INCOME_KEYWORDS = List.of(
            "salaire", "salary", "revenu", "income", "bulletin", "paie",
            "pay", "employeur", "contrat", "tax", "impôt", "bank statement",
            "relevé", "attestation");

    private OcrMatching() {
    }

    /** Champs d'identité du dossier utilisés par {@link #matchOcrWithApplication}. */
    public record ApplicantIdentity(
            String lastName,
            String firstName,
            String birthName,
            String identityDocumentNumber,
            String birthDate) {
    }

    // ------------------------------------------------------------------
    // normalize_for_match (l.124)
    // ------------------------------------------------------------------

    /**
     * Normalisation pour comparaison : NFD + suppression des accents (marques
     * combinantes), majuscules, remplacement des non-alphanumériques par des espaces
     * et compactage des espaces.
     */
    public static String normalizeForMatch(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = COMBINING_MARKS.matcher(normalized).replaceAll("");
        normalized = normalized.toUpperCase(Locale.ROOT);
        normalized = NON_ALNUM.matcher(normalized).replaceAll(" ");
        return WHITESPACE.matcher(normalized).replaceAll(" ").strip();
    }

    // ------------------------------------------------------------------
    // difflib SequenceMatcher.ratio() (2*M/T)
    // ------------------------------------------------------------------

    /** Équivalent de {@code SequenceMatcher(None, a, b).ratio()} de difflib. */
    public static double ratio(String a, String b) {
        String left = a == null ? "" : a;
        String right = b == null ? "" : b;
        int total = left.length() + right.length();
        if (total == 0) {
            return 1.0;
        }
        return 2.0 * matchingCharacters(left, right) / total;
    }

    private static int matchingCharacters(String a, String b) {
        Map<Character, List<Integer>> b2j = new LinkedHashMap<>();
        for (int j = 0; j < b.length(); j++) {
            b2j.computeIfAbsent(b.charAt(j), k -> new ArrayList<>()).add(j);
        }

        Deque<int[]> queue = new ArrayDeque<>();
        queue.push(new int[]{0, a.length(), 0, b.length()});
        int matches = 0;

        while (!queue.isEmpty()) {
            int[] interval = queue.pop();
            int alo = interval[0];
            int ahi = interval[1];
            int blo = interval[2];
            int bhi = interval[3];

            int[] match = findLongestMatch(a, b2j, alo, ahi, blo, bhi);
            int i = match[0];
            int j = match[1];
            int k = match[2];

            if (k > 0) {
                matches += k;
                if (alo < i && blo < j) {
                    queue.push(new int[]{alo, i, blo, j});
                }
                if (i + k < ahi && j + k < bhi) {
                    queue.push(new int[]{i + k, ahi, j + k, bhi});
                }
            }
        }
        return matches;
    }

    private static int[] findLongestMatch(String a, Map<Character, List<Integer>> b2j,
                                          int alo, int ahi, int blo, int bhi) {
        int besti = alo;
        int bestj = blo;
        int bestsize = 0;
        Map<Integer, Integer> j2len = new LinkedHashMap<>();

        for (int i = alo; i < ahi; i++) {
            Map<Integer, Integer> newJ2len = new LinkedHashMap<>();
            List<Integer> indices = b2j.get(a.charAt(i));
            if (indices != null) {
                for (int j : indices) {
                    if (j < blo) {
                        continue;
                    }
                    if (j >= bhi) {
                        break;
                    }
                    int k = j2len.getOrDefault(j - 1, 0) + 1;
                    newJ2len.put(j, k);
                    if (k > bestsize) {
                        besti = i - k + 1;
                        bestj = j - k + 1;
                        bestsize = k;
                    }
                }
            }
            j2len = newJ2len;
        }
        return new int[]{besti, bestj, bestsize};
    }

    // ------------------------------------------------------------------
    // fuzzy_contains (l.134)
    // ------------------------------------------------------------------

    public static boolean fuzzyContains(String needle, String haystack) {
        return fuzzyContains(needle, haystack, 0.78);
    }

    public static boolean fuzzyContains(String needleRaw, String haystackRaw, double minRatio) {
        String needle = normalizeForMatch(needleRaw);
        String haystack = normalizeForMatch(haystackRaw);

        if (needle.isEmpty() || haystack.isEmpty()) {
            return false;
        }
        if (haystack.contains(needle)) {
            return true;
        }

        String[] words = haystack.split(" ");
        int n = Math.max(1, needle.split(" ").length);
        int limit = Math.max(1, words.length - n + 1);

        for (int i = 0; i < limit; i++) {
            int end = Math.min(i + n, words.length);
            String chunk = String.join(" ", List.of(words).subList(i, end));
            if (ratio(needle, chunk) >= minRatio) {
                return true;
            }
        }

        return ratio(needle, haystack) >= minRatio;
    }

    // ------------------------------------------------------------------
    // build_birth_date_variants (l.295) + match_date_in_ocr (l.327)
    // ------------------------------------------------------------------

    static java.util.Set<String> buildBirthDateVariants(String birthDate) {
        String raw = birthDate == null ? "" : birthDate.strip();
        if (raw.isEmpty()) {
            return java.util.Set.of();
        }

        LinkedHashSet<String> rawVariants = new LinkedHashSet<>();
        String digits = NON_DIGIT.matcher(raw).replaceAll("");
        if (!digits.isEmpty()) {
            rawVariants.add(digits);
        }

        Matcher iso = ISO_DATE.matcher(raw);
        if (iso.find()) {
            String yyyy = iso.group(1);
            String mm = iso.group(2);
            String dd = iso.group(3);
            rawVariants.add(yyyy + mm + dd);
            rawVariants.add(dd + mm + yyyy);
            rawVariants.add(dd + "/" + mm + "/" + yyyy);
            rawVariants.add(dd + "-" + mm + "-" + yyyy);
            rawVariants.add(dd + "." + mm + "." + yyyy);
            rawVariants.add(dd + " " + mm + " " + yyyy);
        }

        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String variant : rawVariants) {
            String nv = normalizeForMatch(variant);
            if (!nv.isEmpty()) {
                normalized.add(nv);
            }
        }
        return normalized;
    }

    public static boolean matchDateInOcr(String birthDate, String ocrText) {
        java.util.Set<String> variants = buildBirthDateVariants(birthDate);
        String normalizedText = normalizeForMatch(ocrText);
        String compactText = WHITESPACE.matcher(normalizedText).replaceAll("");

        for (String variant : variants) {
            String compactVariant = WHITESPACE.matcher(variant).replaceAll("");
            if (!compactVariant.isEmpty() && compactText.contains(compactVariant)) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------------
    // match_ocr_with_application (l.340)
    // ------------------------------------------------------------------

    public static Map<String, Object> matchOcrWithApplication(String ocrText, ApplicantIdentity application) {
        String text = normalizeForMatch(ocrText);

        String lastName = normalizeForMatch(application.lastName());
        String firstName = normalizeForMatch(application.firstName());
        String birthName = normalizeForMatch(application.birthName());
        String documentNumber = normalizeForMatch(application.identityDocumentNumber());
        String birthDate = application.birthDate() == null ? "" : application.birthDate();

        List<Map<String, Object>> checks = new ArrayList<>();
        int score = 0;

        boolean lastNameOk = !lastName.isEmpty() && fuzzyContains(lastName, text);
        boolean firstNameOk = !firstName.isEmpty() && fuzzyContains(firstName, text);
        boolean birthNameOk = !birthName.isEmpty() && fuzzyContains(birthName, text);

        if (lastNameOk) {
            score += 30;
        }
        if (firstNameOk) {
            score += 25;
        }
        if (!birthName.isEmpty() && birthNameOk) {
            score += 15;
        }

        checks.add(check("last_name", lastName, lastNameOk));
        checks.add(check("first_name", firstName, firstNameOk));
        if (!birthName.isEmpty()) {
            checks.add(check("birth_name", birthName, birthNameOk));
        }

        boolean documentNumberOk = false;
        if (!documentNumber.isEmpty()) {
            String compactText = WHITESPACE.matcher(text).replaceAll("");
            String compactDoc = WHITESPACE.matcher(documentNumber).replaceAll("");
            documentNumberOk = compactText.contains(compactDoc) || fuzzyContains(documentNumber, text, 0.72);
            if (documentNumberOk) {
                score += 30;
            }
            checks.add(check("identity_document_number", documentNumber, documentNumberOk));
        }

        boolean birthDateOk = false;
        if (!birthDate.isEmpty()) {
            birthDateOk = matchDateInOcr(birthDate, ocrText);
            if (birthDateOk) {
                score += 10;
            }
            Map<String, Object> dateCheck = new LinkedHashMap<>();
            dateCheck.put("field", "birth_date");
            dateCheck.put("expected", birthDate);
            dateCheck.put("matched", birthDateOk);
            checks.add(dateCheck);
        }

        score = Math.max(0, Math.min(100, score));

        String status;
        if (ocrText == null || ocrText.isEmpty()) {
            status = "OCR_REVIEW_REQUIRED";
        } else if (score >= 65) {
            status = "MATCH_OK";
        } else if (score >= 35) {
            status = "PARTIAL_MATCH";
        } else {
            status = "MISMATCH";
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("match_score", score);
        result.put("match_status", status);
        result.put("checks", checks);
        return result;
    }

    // ------------------------------------------------------------------
    // normalize_rib_for_matching (l.408) + match_rib_with_application (l.413)
    // ------------------------------------------------------------------

    public static String normalizeRibForMatching(String value) {
        return value == null ? "" : NON_DIGIT.matcher(value).replaceAll("");
    }

    public static Map<String, Object> matchRibWithApplication(String ocrText, String rib) {
        String expected = normalizeRibForMatching(rib);

        LinkedHashSet<String> unique = new LinkedHashSet<>();
        Matcher matcher = RIB_NUMBER.matcher(ocrText == null ? "" : ocrText);
        while (matcher.find()) {
            String normalized = normalizeRibForMatching(matcher.group());
            if (!normalized.isEmpty()) {
                unique.add(normalized);
            }
        }
        List<String> candidates = new ArrayList<>(unique);
        // tri par longueur décroissante (stable) — parité sorted(..., key=len, reverse=True).
        candidates.sort((x, y) -> Integer.compare(y.length(), x.length()));

        List<Map<String, Object>> checks = new ArrayList<>();
        Map<String, Object> check = new LinkedHashMap<>();
        check.put("field", "rib");
        check.put("expected", expected);
        check.put("detected_candidates",
                new ArrayList<>(candidates.subList(0, Math.min(8, candidates.size()))));
        check.put("status", "NOT_CHECKED");
        check.put("score", 0);
        checks.add(check);

        if (expected.isEmpty()) {
            check.put("status", "NO_RIB_PROVIDED");
            return ribResult(0, "OCR_REVIEW_REQUIRED", checks);
        }

        int bestScore = 0;
        String bestCandidate = "";

        for (String candidate : candidates) {
            if (candidate.contains(expected) || expected.contains(candidate)) {
                bestScore = 100;
                bestCandidate = candidate;
                break;
            }
            int score = (int) (ratio(expected, candidate) * 100);
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }

        check.put("detected", bestCandidate);
        check.put("score", bestScore);

        String status;
        if (bestScore >= 90) {
            check.put("status", "MATCH");
            status = "MATCH_OK";
        } else if (bestScore >= 65) {
            check.put("status", "PARTIAL_MATCH");
            status = "PARTIAL_MATCH";
        } else {
            check.put("status", "MISMATCH");
            status = "MISMATCH";
        }

        return ribResult(bestScore, status, checks);
    }

    // ------------------------------------------------------------------
    // match_income_document (l.471)
    // ------------------------------------------------------------------

    public static Map<String, Object> matchIncomeDocument(String ocrText) {
        String text = ocrText == null ? "" : ocrText.strip();
        String lower = text.toLowerCase(Locale.ROOT);

        List<String> found = new ArrayList<>();
        for (String keyword : INCOME_KEYWORDS) {
            if (lower.contains(keyword.toLowerCase(Locale.ROOT))) {
                found.add(keyword);
            }
        }

        int score = !found.isEmpty() ? 70 : (text.length() > 30 ? 40 : 0);
        String status = score >= 60 ? "PARTIAL_MATCH" : "OCR_REVIEW_REQUIRED";

        Map<String, Object> check = new LinkedHashMap<>();
        check.put("field", "income_proof");
        check.put("expected", "Justificatif de revenu");
        check.put("detected_keywords", found);
        check.put("status", !found.isEmpty() ? "DOCUMENT_READABLE" : "REVIEW_REQUIRED");
        check.put("score", score);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("match_score", score);
        result.put("match_status", status);
        result.put("checks", List.of(check));
        return result;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private static Map<String, Object> check(String field, String expected, boolean matched) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("field", field);
        map.put("expected", expected);
        map.put("matched", matched);
        return map;
    }

    private static Map<String, Object> ribResult(int matchScore, String matchStatus,
                                                 List<Map<String, Object>> checks) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("match_score", matchScore);
        result.put("match_status", matchStatus);
        result.put("checks", checks);
        return result;
    }
}
