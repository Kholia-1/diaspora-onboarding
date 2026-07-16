"""extraction.py — extraction des champs KYC depuis le texte OCR.

Port fidèle des fonctions d'extraction de app/routers/pre_onboarding.py :
extract_prefill_fields() et la famille v2_* (MRZ, CNI recto/verso, passeport,
dates, NIU, RCCM, entreprise...), ainsi que leurs helpers.

Les CLÉS de sortie sont identiques au legacy (last_name, first_name, birth_date,
identity_document_number, cni_number, passport_number, place_of_birth,
nationality, profession, tax_identification_number, niu, rib, rccm, ...).

API publique : extract_fields(raw_text, document_type, account_type) -> dict.
"""
import re
from typing import Any


def clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_text(value: str | None) -> str:
    text = clean_text(value).upper()
    replacements = {
        "É": "E", "È": "E", "Ê": "E",
        "À": "A", "Â": "A",
        "Ù": "U", "Û": "U",
        "Ô": "O",
        "Ç": "C",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def extract_dates(text: str) -> list[str]:
    # Dates pointées CNI camerounaises (15.01.1990) acceptées comme / et -.
    patterns = [
        r"\b\d{2}[.//-]\d{2}[.//-]\d{4}\b",
        r"\b\d{4}[.//-]\d{2}[.//-]\d{2}\b",
    ]

    dates = []
    for pattern in patterns:
        dates.extend(re.findall(pattern, text or ""))

    dates = [d.replace(".", "/") for d in dates]

    return list(dict.fromkeys(dates))


def extract_email(text: str) -> str | None:
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text or "")
    return match.group(0) if match else None


def extract_phone(text: str, allow_generic: bool = True) -> str | None:
    if not allow_generic:
        return None

    candidates = re.findall(r"(\+\d[\d\s().-]{7,}\d)", text or "")

    if not candidates:
        candidates = re.findall(r"\b(6[0-9\s().-]{7,}\d|2[0-9\s().-]{7,}\d)\b", text or "")

    if not candidates:
        return None

    return clean_text(candidates[0])


def is_identity_document(document_type: str | None) -> bool:
    doc = normalize_text(document_type or "")
    keywords = [
        "IDENTITY",
        "IDENTITE",
        "PIECE",
        "CNI",
        "PASSPORT",
        "PASSEPORT",
        "LEGAL_REPRESENTATIVE_IDENTITY",
    ]
    return any(k in doc for k in keywords)


def find_date_near_keywords(text: str, keywords: list[str]) -> str | None:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]

    for i, line in enumerate(lines):
        normalized_line = normalize_text(line)

        if any(keyword in normalized_line for keyword in keywords):
            window = " ".join(lines[i:i + 3])
            dates = extract_dates(window)

            if dates:
                return dates[0]

    return None


def extract_niu_or_tax_number(text: str) -> str | None:
    normalized = normalize_text(text)

    patterns = [
        r"\bNIU\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
        r"\bNIF\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
        r"\bNUMERO\s+FISCAL\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
        r"\bNO\s+FISCAL\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)
        if match:
            return match.group(1)

    return None


def extract_identity_number(text: str) -> str | None:
    normalized = normalize_text(text)

    patterns = [
        r"\bCNI\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
        r"\bPASSEPORT\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
        r"\bPASSPORT\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
        r"\bDOCUMENT\s*NO\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
        r"\bN[°O]\s*[:\-]?\s*([A-Z0-9\-\/]{5,30})",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)
        if match:
            return match.group(1)

    return None


def extract_rib_or_iban(text: str) -> str | None:
    normalized = normalize_text(text)

    iban_match = re.search(r"\b[A-Z]{2}\d{2}[A-Z0-9\s]{10,34}\b", normalized)
    if iban_match:
        return clean_text(iban_match.group(0))

    numbers = re.findall(r"[0-9][0-9\s\-\.]{10,}[0-9]", text or "")
    if numbers:
        return clean_text(numbers[0])

    return None


def extract_rccm(text: str) -> str | None:
    normalized = normalize_text(text)

    match = re.search(r"\bRCCM\s*[:\-]?\s*([A-Z0-9\-\/]{5,40})", normalized)
    if match:
        return match.group(1)

    return None


def guess_company_name(text: str) -> str | None:
    normalized = normalize_text(text)

    patterns = [
        r"\bRAISON\s+SOCIALE\s*[:\-]?\s*([A-Z0-9\s&.'\-]{3,80})",
        r"\bDENOMINATION\s*[:\-]?\s*([A-Z0-9\s&.'\-]{3,80})",
        r"\bNOM\s+COMMERCIAL\s*[:\-]?\s*([A-Z0-9\s&.'\-]{3,80})",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)
        if match:
            return clean_text(match.group(1)).title()

    return None


# ---------------------------------------------------------------------------
# CNI recto — extraction des noms (helpers).
# ---------------------------------------------------------------------------
def clean_name_candidate(value: str | None) -> str | None:
    value = clean_text(value)

    if not value:
        return None

    value = re.sub(
        r"\b(NOMS?|SURNAME|LAST NAME|FAMILY NAME|PRENOMS?|GIVEN NAMES?|FIRST NAME|FORENAMES?)\b",
        " ",
        value,
        flags=re.I,
    )

    value = re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]", " ", value)
    value = clean_text(value)

    if len(value) < 2:
        return None

    normalized = normalize_text(value)

    forbidden = [
        "REPUBLIQUE", "REPUBLIC", "CAMEROUN", "CAMEROON",
        "IDENTITE", "IDENTITY", "CARTE", "CARD",
        "NATIONALITE", "NATIONALITY", "DATE", "NAISSANCE", "BIRTH",
        "SEXE", "SEX", "TAILLE", "HEIGHT", "SIGNATURE",
        "AUTORITE", "AUTHORITY", "DELIVRE", "ISSUE", "EXPIRE",
        "VALIDITE", "NUMERO", "NUMBER",
    ]

    if any(word in normalized for word in forbidden):
        return None

    if len(value.split()) > 6:
        return None

    return value.upper()


def extract_value_near_identity_label(text: str, label_keywords: list[str], forbidden_keywords: list[str] | None = None) -> str | None:
    forbidden_keywords = forbidden_keywords or []

    lines = [clean_text(line) for line in (text or "").splitlines()]
    lines = [line for line in lines if line]

    for i, line in enumerate(lines):
        normalized_line = normalize_text(line)

        if any(keyword in normalized_line for keyword in label_keywords) and not any(f in normalized_line for f in forbidden_keywords):
            parts = re.split(r"[:：\-]", line, maxsplit=1)
            if len(parts) == 2:
                candidate = clean_name_candidate(parts[1])
                if candidate:
                    return candidate

            candidate_same_line = line
            for keyword in label_keywords:
                candidate_same_line = re.sub(keyword, " ", candidate_same_line, flags=re.I)

            candidate = clean_name_candidate(candidate_same_line)
            if candidate:
                return candidate

            for j in range(i + 1, min(i + 4, len(lines))):
                next_line = lines[j]
                normalized_next = normalize_text(next_line)

                label_words = [
                    "NOM", "NOMS", "SURNAME", "PRENOM", "PRENOMS", "GIVEN",
                    "DATE", "NAISSANCE", "BIRTH", "SEXE", "SEX", "NATIONALITE",
                ]

                if any(word in normalized_next for word in label_words):
                    continue

                candidate = clean_name_candidate(next_line)
                if candidate:
                    return candidate

    return None


def extract_identity_names(ocr_text: str) -> dict[str, str]:
    result: dict[str, str] = {}

    last_name = extract_value_near_identity_label(
        ocr_text,
        ["NOMS", "NOM", "SURNAME", "LAST NAME", "FAMILY NAME"],
        forbidden_keywords=["PRENOM", "PRENOMS", "GIVEN", "FIRST"],
    )

    first_name = extract_value_near_identity_label(
        ocr_text,
        ["PRENOMS", "PRENOM", "GIVEN NAMES", "GIVEN NAME", "FIRST NAME", "FORENAMES"],
        forbidden_keywords=["NOMS", "SURNAME", "LAST NAME", "FAMILY NAME"],
    )

    if last_name:
        result["last_name"] = last_name
        result["surname"] = last_name

    if first_name:
        result["first_name"] = first_name
        result["given_names"] = first_name

    if last_name and first_name:
        result["full_name"] = clean_text(f"{last_name} {first_name}")
    elif last_name:
        result["full_name"] = last_name
    elif first_name:
        result["full_name"] = first_name

    return result


# ---------------------------------------------------------------------------
# CNI recto bruitée — fallback.
# ---------------------------------------------------------------------------
def extract_name_words_from_noisy_line(line: str, label_patterns: list[str]) -> list[str]:
    normalized = normalize_text(line)

    for pattern in label_patterns:
        normalized = re.sub(pattern, " ", normalized, flags=re.I)

    normalized = re.sub(r"[^A-Z\s'\-]", " ", normalized)
    normalized = clean_text(normalized)

    words = re.findall(r"[A-Z]{2,}", normalized)

    forbidden = {
        "LE", "LA", "LES", "DES", "DE", "DU", "ET", "A", "EN",
        "NOM", "NOMS", "NON", "SURNAME", "SURNOM", "SURNAMES",
        "PRENOM", "PRENOMS", "GIVEN", "FIRST", "LAST",
        "REPUBLIQUE", "REPUBLIC", "CAMEROUN", "CAMEROON",
        "IDENTITE", "IDENTITY", "CARTE", "CARD",
        "NATIONALITE", "NATIONALITY", "DATE", "NAISSANCE", "BIRTH",
        "SEXE", "SEX", "TAILLE", "HEIGHT",
        "SIGNATURE", "AUTORITE", "AUTHORITY",
        "DELIVRE", "DELIVREE", "ISSUE", "EXPIRE", "VALIDITE",
        "NUMERO", "NUMBER", "OCCUPATION", "PROFESSION",
        "PERE", "MERE", "FATHER", "MOTHER",
    }

    clean_words = []
    for word in words:
        if word in forbidden:
            continue

        if len(word) < 3:
            continue

        vowels = sum(1 for c in word if c in "AEIOUY")
        if len(word) >= 5 and vowels == 0:
            continue

        clean_words.append(word)

    return clean_words


def extract_noisy_identity_names(ocr_text: str) -> dict[str, str]:
    result: dict[str, str] = {}

    lines = [clean_text(line) for line in (ocr_text or "").splitlines()]
    lines = [line for line in lines if line]

    surname_patterns = [
        r"\bNOMS?\b",
        r"\bNON\b",
        r"\bSURNAME\b",
        r"\bSURN[A-Z]*\b",
        r"\bSURAA[A-Z]*\b",
        r"\bSURAW[A-Z]*\b",
    ]

    first_name_patterns = [
        r"\bPRENOMS?\b",
        r"\bPREN[A-Z]*\b",
        r"\bGIVEN\s+NAMES?\b",
        r"\bFIRST\s+NAME\b",
    ]

    for line in lines[:15]:
        normalized_line = normalize_text(line)

        looks_like_surname_line = any(re.search(pattern, normalized_line, flags=re.I) for pattern in surname_patterns)

        if not looks_like_surname_line:
            continue

        words = extract_name_words_from_noisy_line(line, surname_patterns)

        if 1 <= len(words) <= 4:
            result["last_name"] = " ".join(words[:3])
            result["surname"] = result["last_name"]
            break

    for line in lines[:18]:
        normalized_line = normalize_text(line)

        looks_like_first_name_line = any(re.search(pattern, normalized_line, flags=re.I) for pattern in first_name_patterns)

        if not looks_like_first_name_line:
            continue

        words = extract_name_words_from_noisy_line(line, first_name_patterns)

        if 1 <= len(words) <= 5:
            result["first_name"] = " ".join(words[:4])
            result["given_names"] = result["first_name"]
            break

    if result.get("last_name") and result.get("first_name"):
        result["full_name"] = clean_text(f"{result['last_name']} {result['first_name']}")
    elif result.get("last_name"):
        result["full_name"] = result["last_name"]
    elif result.get("first_name"):
        result["full_name"] = result["first_name"]

    return result


# ---------------------------------------------------------------------------
# CAMEROON_DOC_EXTRACTION_V2 — moteur d'extraction principal.
# ---------------------------------------------------------------------------
def v2_lines(text: str) -> list[str]:
    return [clean_text(line) for line in (text or "").splitlines() if clean_text(line)]


def v2_clean_name(value: str | None) -> str | None:
    value = clean_text(value)

    if not value:
        return None

    value = normalize_text(value)

    # Supprimer libellés normaux et variantes OCR
    # ([PR]RENOMS : RENOMS = PRENOMS avec P perdu ; GIVEM/G1VEN/GLVEN : déformations
    # fréquentes de GIVEN ; NAMES seul aussi).
    value = re.sub(
        r"\b(NOMS?|SURNAME|SURNAMES|SURAAWE|SURAWE|SURNARNE|[PR]RENOMS?|RENOMS?|PRENOM|(?:GIVEN|GIVEM|G1VEN|GLVEN)\s*NAMES?|NAMES|FIRST NAME|FORENAMES?)\b",
        " ",
        value,
        flags=re.I,
    )

    value = re.sub(r"[^A-Z\s'\-]", " ", value)
    value = clean_text(value)

    if not value:
        return None

    forbidden = {
        "REPUBLIQUE", "REPUBLIC", "CAMEROUN", "CAMEROON",
        "CARTE", "IDENTITE", "IDENTITY", "CARD",
        "PASSEPORT", "PASSPORT",
        "NATIONALITE", "NATIONALITY",
        "DATE", "NAISSANCE", "BIRTH",
        "SEXE", "SEX",
        "TAILLE", "HEIGHT",
        "SIGNATURE",
        "AUTORITE", "AUTHORITY",
        "DELIVRE", "DELIVREE", "ISSUE",
        "EXPIRE", "EXPIRATION", "VALIDITE",
        "NUMERO", "NUMBER",
        "OCCUPATION", "PROFESSION",
        "PERE", "MERE", "FATHER", "MOTHER",
        "ADRESSE", "ADDRESS",
        "LIEU", "PLACE",
    }

    words = []
    for word in value.split():
        if word in forbidden:
            continue
        if len(word) < 3:
            continue

        # AFB_CNI_CORPUS_TUNING_V1 : débris de libellés fusionnés par l'OCR
        # (« DATEDENAISSANCHARATEOFBIRTH ») — jamais de vrais noms.
        if len(word) > 14:
            continue
        if re.search(r"NAISSANCE|BIRTH|EXPIR|SIGNAT|IDENTIT|REPUBL|DELIVR|OCCUPAT|PROFESS|CAMEROUN|CAMEROON|NATIONAL", word):
            continue

        vowels = sum(1 for c in word if c in "AEIOUY")
        if len(word) >= 5 and vowels == 0:
            continue

        words.append(word)

    if not words:
        return None

    if len(words) > 6:
        return None

    return " ".join(words)


def v2_extract_label_value(lines: list[str], label_patterns: list[str], max_next_lines: int = 3) -> str | None:
    for i, line in enumerate(lines):
        nline = normalize_text(line)

        matched = None
        for pattern in label_patterns:
            if re.search(pattern, nline, flags=re.I):
                matched = pattern
                break

        if not matched:
            continue

        parts = re.split(r"[:：\-]", line, maxsplit=1)
        if len(parts) == 2:
            candidate = v2_clean_name(parts[1])
            if candidate:
                return candidate

        # AFB_OCR_VALUE_ADJACENT_LABEL_V1 : RapidOCR fusionne souvent plusieurs
        # zones en une seule grande ligne, avec la valeur juste AVANT son libellé
        # (sur la CNI 2024 la valeur est imprimée au-dessus du libellé). On ne
        # garde que les mots immédiatement adjacents.
        m = re.search(matched, nline, flags=re.I)
        if m:
            before_words = nline[:m.start()].split()[-3:]
            candidate = v2_clean_name(" ".join(before_words))
            if candidate:
                return candidate

            after_words = nline[m.end():].split()[:3]
            candidate = v2_clean_name(" ".join(after_words))
            if candidate:
                return candidate

        same_line = nline
        for pattern in label_patterns:
            same_line = re.sub(pattern, " ", same_line, flags=re.I)

        candidate = v2_clean_name(same_line)
        if candidate:
            return candidate

        for j in range(i + 1, min(i + 1 + max_next_lines, len(lines))):
            next_line = lines[j]
            nnext = normalize_text(next_line)

            if re.search(r"\b(DATE|SEXE|SEX|NATIONALITE|NATIONALITY|TAILLE|HEIGHT|SIGNATURE|LIEU|PLACE|PERE|MERE|FATHER|MOTHER)\b", nnext):
                break

            candidate = v2_clean_name(next_line)
            if candidate:
                return candidate

    return None


def v2_extract_mrz_lines(text: str) -> list[str]:
    lines = []

    for line in v2_lines(text):
        compact = normalize_text(line)
        compact = compact.replace(" ", "")
        compact = compact.replace("«", "<").replace("‹", "<").replace("＜", "<")
        compact = re.sub(r"[^A-Z0-9<]", "", compact)

        if "<<" in compact and len(compact) >= 15:
            lines.append(compact)

    return lines


def v2_parse_name_from_mrz(text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    mrz_lines = v2_extract_mrz_lines(text)

    for line in mrz_lines:
        candidate = line

        if candidate.startswith("P"):
            idx = candidate.find("CMR")
            if idx >= 0:
                candidate = candidate[idx + 3:]

        if "<<" not in candidate:
            continue

        # AFB_CNI_MRZ_FUSED_LINES_V1 : RapidOCR fusionne souvent les 3 lignes MRZ
        # en une seule. Le segment des noms est celui dont la partie gauche ne
        # contient AUCUN chiffre : on le choisit plutôt que le premier « << ».
        left = None
        right = None
        for m in re.finditer(r"([A-Z][A-Z<]{2,}?)<<([A-Z][A-Z<]*)", candidate):
            left_candidate = m.group(1)
            if re.search(r"\d", left_candidate):
                continue
            left = left_candidate
            right = m.group(2)

        if left is None:
            left, right = candidate.split("<<", 1)

        left = re.sub(r"^(IDCMR|CMR|I?DCMR|P<CMR|POCMR)", "", left)
        left = re.sub(r"[^A-Z<]", "", left).replace("<", " ")

        # AFB_CNI_CORPUS_TUNING_V2 : la partie droite s'arrête au premier segment
        # contenant des chiffres (lignes MRZ suivantes fusionnées) ; « CMR » écarté.
        right_tokens = []
        for token in right.replace("<", " ").split():
            if re.search(r"\d", token):
                break
            token = re.sub(r"[^A-Z]", "", token)
            if not token or "CMR" in token:
                continue
            right_tokens.append(token)
        right = " ".join(right_tokens)

        last_name = v2_clean_name(left)
        first_name = v2_clean_name(right)

        if last_name:
            result["last_name"] = last_name
            result["surname"] = last_name

        if first_name:
            result["first_name"] = first_name
            result["given_names"] = first_name

        if result.get("last_name") and result.get("first_name"):
            result["full_name"] = clean_text(f"{result['last_name']} {result['first_name']}")
        elif result.get("last_name"):
            result["full_name"] = result["last_name"]

        if result:
            return result

    return result


def v2_extract_names(text: str) -> dict[str, str]:
    result: dict[str, str] = {}

    mrz_names = v2_parse_name_from_mrz(text)
    result.update(mrz_names)

    lines = v2_lines(text)

    if not result.get("last_name"):
        last_name = v2_extract_label_value(
            lines,
            [
                r"\bNOM\s*/?\s*SURNAME\b",
                # AFB_CNI_SIDE_AWARE_V1 : ne pas confondre le NOM du titulaire
                # avec « NOM DU PERE » / « NOM DE LA MERE » du verso.
                r"\bNOMS?\b(?!\s*(?:DU\s*PERE|DE\s*LA\s*MERE|DU|DE\s*LA)\b)",
                r"\bSURNAME\b",
                r"\bSURNAMES\b",
                r"\bSURAAWE\b",
                r"\bSURAWE\b",
                r"\bSURNARNE\b",
            ],
        )

        if last_name:
            result["last_name"] = last_name
            result["surname"] = last_name

    if not result.get("first_name"):
        first_name = v2_extract_label_value(
            lines,
            [
                r"\bPRENOMS?\s*/?\s*GIVEN\s+NAMES?\b",
                r"\bPRENOMS?\b",
                r"\bGIVEN\s+NAMES?\b",
                r"\bFIRST\s+NAME\b",
                r"\bFORENAMES?\b",
                # AFB_CNI_CORPUS_TUNING_V1 : variantes OCR — « RENOMS/GIVEN NAMES »
                # (P perdu), « JYIN NAMI » (GIVEN NAMES très dégradé).
                r"\bRENOMS?\b",
                r"\b[GJ][A-Z]{0,3}N\s+NAM[EI]S?\w*\b",
            ],
        )

        if first_name:
            result["first_name"] = first_name
            result["given_names"] = first_name

    if not result.get("last_name"):
        for line in lines[:18]:
            nline = normalize_text(line)

            if not re.search(r"\b(SURNAME|SURAAWE|SURAWE|SURNARNE)\b", nline):
                continue

            candidate = v2_clean_name(line)

            if candidate:
                result["last_name"] = candidate
                result["surname"] = candidate
                break

    if result.get("last_name") and result.get("first_name"):
        result["full_name"] = clean_text(f"{result['last_name']} {result['first_name']}")
    elif result.get("last_name"):
        result["full_name"] = result["last_name"]
    elif result.get("first_name"):
        result["full_name"] = result["first_name"]

    return result


def v2_extract_dates(text: str) -> list[str]:
    dates = extract_dates(text)

    month_map = {
        "JAN": "01", "JANV": "01",
        "FEV": "02", "FEB": "02",
        "MAR": "03",
        "AVR": "04", "APR": "04",
        "MAI": "05", "MAY": "05",
        "JUN": "06", "JUIN": "06",
        "JUL": "07", "JUIL": "07",
        "AOU": "08", "AUG": "08",
        "SEP": "09", "SEPT": "09",
        "OCT": "10",
        "NOV": "11",
        "DEC": "12",
    }

    pattern = r"\b([0-3]?\d)\s+([A-Z]{3,5})(?:/[A-Z]{3,5})?\s+(\d{4})\b"

    for day, mon, year in re.findall(pattern, normalize_text(text)):
        mon = mon[:4]
        month = month_map.get(mon) or month_map.get(mon[:3])
        if month:
            dates.append(f"{day.zfill(2)}/{month}/{year}")

    return list(dict.fromkeys(dates))


def v2_find_date_near_keywords(text: str, keywords: list[str]) -> str | None:
    lines = v2_lines(text)

    for i, line in enumerate(lines):
        nline = normalize_text(line)

        if any(keyword in nline for keyword in keywords):
            window = " ".join(lines[i:i + 4])
            dates = v2_extract_dates(window)

            if dates:
                return dates[0]

    return None


def v2_extract_passport_number(text: str) -> str | None:
    normalized = normalize_text(text)

    patterns = [
        r"\bPASSPORT\s*(?:NO|N°|NUMBER)?\s*[:\-]?\s*([A-Z0-9]{5,15})",
        r"\bN[°O]\s*DE\s*PASSEPORT\s*[:\-]?\s*([A-Z0-9]{5,15})",
        r"\bPASSEPORT\s*[:\-]?\s*([A-Z0-9]{5,15})",
    ]

    for pattern in patterns:
        m = re.search(pattern, normalized)
        if m:
            return m.group(1)

    for line in v2_extract_mrz_lines(text):
        if re.match(r"^[A-Z0-9]{6,12}<", line):
            value = line.split("<", 1)[0]
            value = re.sub(r"[^A-Z0-9]", "", value)

            if len(value) >= 6:
                return value

    m = re.search(r"\b([0-9]{6,9})\b", normalized)
    if "PASSPORT" in normalized or "PASSEPORT" in normalized:
        if m:
            return m.group(1)

    return None


def v2_extract_cni_number(text: str) -> str | None:
    normalized = normalize_text(text)

    patterns = [
        r"\bNUMERO\s+CNI\s*/?\s*NIC\s+NUMBER\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bNIC\s+NUMBER\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bIDENTIFIANT\s+UNIQUE\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bUNIQUE\s+IDENTIFIER\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bCNI\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bN[°O]\s*[:\-]?\s*([A-Z0-9]{6,20})",
    ]

    for pattern in patterns:
        m = re.search(pattern, normalized)
        if m:
            return m.group(1)

    for line in v2_extract_mrz_lines(text):
        m = re.search(r"(?:IDCMR|DCMR|ICMR)([0-9]{8,12})", line)
        if m:
            value = m.group(1)

            if len(value) >= 9:
                return value[:9]

            return value

    return None


def v2_extract_simple_value(text: str, label_patterns: list[str]) -> str | None:
    lines = v2_lines(text)

    for i, line in enumerate(lines):
        nline = normalize_text(line)

        if any(re.search(pattern, nline, flags=re.I) for pattern in label_patterns):
            parts = re.split(r"[:：\-]", line, maxsplit=1)

            if len(parts) == 2:
                value = clean_text(parts[1])
                if value:
                    return value.upper()

            residue = nline
            for pattern in label_patterns:
                residue = re.sub(pattern, " ", residue, flags=re.I)
            residue = re.sub(r"[/|]", " ", residue)
            residue = clean_text(residue)

            if residue and 2 <= len(residue) <= 40:
                return residue.upper()

            for j in range(i + 1, min(i + 3, len(lines))):
                value = clean_text(lines[j])
                if value:
                    return value.upper()

    return None


def v2_extract_identity_fields(account_type: str, document_type: str, ocr_text: str) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    normalized_doc = normalize_text(document_type)
    normalized_text = normalize_text(ocr_text)

    dates = v2_extract_dates(ocr_text)

    if dates:
        fields["possible_dates"] = dates

    names = v2_extract_names(ocr_text)
    fields.update(names)

    birth_date = v2_find_date_near_keywords(
        ocr_text,
        [
            "DATE DE NAISSANCE",
            "DATE OF BIRTH",
            "BIRTH",
            "NE LE",
            "NEE LE",
            "DOB",
            "NAISSANCE",
        ],
    )

    issue_date = v2_find_date_near_keywords(
        ocr_text,
        [
            "DATE DE DELIVRANCE",
            "DATE OF ISSUE",
            "DELIVRANCE",
            "ISSUE",
        ],
    )

    expiry_date = v2_find_date_near_keywords(
        ocr_text,
        [
            "DATE D EXPIRATION",
            "DATE OF EXPIRY",
            "EXPIRATION",
            "EXPIRY",
            "EXPIRE",
            "VALIDITE",
        ],
    )

    if birth_date:
        fields["birth_date"] = birth_date

    if issue_date:
        fields["identity_issue_date"] = issue_date

    if expiry_date:
        fields["identity_expiry_date"] = expiry_date

    nationality = v2_extract_simple_value(
        ocr_text,
        [
            r"\bNATIONALITE\b",
            r"\bNATIONALITY\b",
        ],
    )

    if nationality:
        fields["nationality"] = nationality

    place_of_birth = v2_extract_simple_value(
        ocr_text,
        [
            r"\bLIEU\s+DE\s+NAISSANCE\b",
            r"\bPLACE\s+OF\s+BIRTH\b",
        ],
    )

    if place_of_birth:
        fields["place_of_birth"] = place_of_birth

    occupation = v2_extract_simple_value(
        ocr_text,
        [
            r"\bPROFESSION\b",
            r"\bOCCUPATION\b",
        ],
    )

    if occupation and not re.search(
        r"IDENTIT|NATIONALE|NATIONAL\s*ID|REPUBLI", normalize_text(occupation)
    ):
        fields["profession"] = occupation

    if "PASSPORT" in normalized_doc or "PASSEPORT" in normalized_doc or "PASSPORT" in normalized_text:
        passport_number = v2_extract_passport_number(ocr_text)

        if passport_number:
            fields["passport_number"] = passport_number
            fields["identity_document_number"] = passport_number

    cni_number = v2_extract_cni_number(ocr_text)

    if not cni_number and "CNI" in normalized_doc:
        m = re.search(r"\b(20\d{15})\b", normalized_text)
        if m:
            cni_number = m.group(1)
        else:
            nine_digit_candidates = sorted(set(re.findall(r"\b(\d{9})\b", normalized_text)))
            if len(nine_digit_candidates) == 1:
                cni_number = nine_digit_candidates[0]

    if cni_number:
        fields["cni_number"] = cni_number
        fields["identity_document_number"] = cni_number

    return fields


def extract_prefill_fields(account_type: str, document_type: str, ocr_text: str) -> dict[str, Any]:
    normalized_doc = normalize_text(document_type)
    account_type = normalize_text(account_type)
    identity_doc = is_identity_document(document_type)

    fields: dict[str, Any] = {}

    if identity_doc or "PASSPORT" in normalize_text(ocr_text) or "PASSEPORT" in normalize_text(ocr_text):
        fields.update(v2_extract_identity_fields(account_type, document_type, ocr_text))

    dates = v2_extract_dates(ocr_text)
    if dates and "possible_dates" not in fields:
        fields["possible_dates"] = dates

    email = extract_email(ocr_text)
    if email and not identity_doc:
        fields["email"] = email

    phone = extract_phone(ocr_text, allow_generic=not identity_doc)
    if phone:
        fields["phone"] = phone

    niu = extract_niu_or_tax_number(ocr_text)
    if niu:
        fields["tax_identification_number"] = niu
        fields["niu"] = niu

    if "RIB" in normalized_doc or "BANK" in normalized_doc:
        rib = extract_rib_or_iban(ocr_text)
        if rib:
            fields["rib"] = rib
            fields["iban_or_account_number"] = rib

    if account_type == "BUSINESS":
        rccm = extract_rccm(ocr_text)
        company = guess_company_name(ocr_text)

        if rccm:
            fields["rccm"] = rccm

        if company:
            fields["company_name"] = company

    return fields


def extract_fields(raw_text: str, document_type: str, account_type: str = "") -> dict[str, Any]:
    """Point d'entrée public : mêmes champs et mêmes clés que le legacy.

    Ordre des arguments adapté au service (raw_text d'abord). En interne on
    appelle extract_prefill_fields(account_type, document_type, ocr_text).
    """
    return extract_prefill_fields(account_type or "", document_type or "", raw_text or "")
