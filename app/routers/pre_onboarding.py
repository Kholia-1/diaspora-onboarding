from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from fastapi.concurrency import run_in_threadpool
import re
from typing import Any

from app.services.document_auth_service import (
    extract_text_with_best_engine,
    validate_document_type_against_ocr,
    parse_mrz_icao9303,
)
from app.services.whatsapp_service import send_whatsapp_message
from app.services.callbell_delivery_status_service import get_callbell_message_status


router = APIRouter(
    prefix="/api/pre-onboarding",
    tags=["Pre-onboarding OCR"]
)


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
    # AFB_OCR_DOTTED_DATES_V1 : les CNI camerounaises impriment les dates avec
    # des points (15.01.1990) — formats « . » acceptés au même titre que / et -.
    patterns = [
        r"\b\d{2}[.//-]\d{2}[.//-]\d{4}\b",
        r"\b\d{4}[.//-]\d{2}[.//-]\d{2}\b",
    ]

    dates = []
    for pattern in patterns:
        dates.extend(re.findall(pattern, text or ""))

    # Les consommateurs (préremplissage du formulaire) attendent le format
    # avec « / » — les dates à points sont normalisées à la source.
    dates = [d.replace(".", "/") for d in dates]

    return list(dict.fromkeys(dates))


def extract_email(text: str) -> str | None:
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text or "")
    return match.group(0) if match else None


def extract_phone(text: str, allow_generic: bool = True) -> str | None:
    if not allow_generic:
        return None

    # On évite les extractions trop larges qui confondent CNI / compte / référence avec téléphone.
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
        "LEGAL_REPRESENTATIVE_IDENTITY"
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



# CNI_RECTO_NAME_EXTRACTION_HELPERS_START
def clean_name_candidate(value: str | None) -> str | None:
    value = clean_text(value)

    if not value:
        return None

    # Supprimer les libellés OCR courants
    value = re.sub(
        r"\b(NOMS?|SURNAME|LAST NAME|FAMILY NAME|PRENOMS?|GIVEN NAMES?|FIRST NAME|FORENAMES?)\b",
        " ",
        value,
        flags=re.I
    )

    value = re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]", " ", value)
    value = clean_text(value)

    if len(value) < 2:
        return None

    normalized = normalize_text(value)

    forbidden = [
        "REPUBLIQUE",
        "REPUBLIC",
        "CAMEROUN",
        "CAMEROON",
        "IDENTITE",
        "IDENTITY",
        "CARTE",
        "CARD",
        "NATIONALITE",
        "NATIONALITY",
        "DATE",
        "NAISSANCE",
        "BIRTH",
        "SEXE",
        "SEX",
        "TAILLE",
        "HEIGHT",
        "SIGNATURE",
        "AUTORITE",
        "AUTHORITY",
        "DELIVRE",
        "ISSUE",
        "EXPIRE",
        "VALIDITE",
        "NUMERO",
        "NUMBER"
    ]

    if any(word in normalized for word in forbidden):
        return None

    # Éviter les lignes trop longues qui sont souvent des phrases OCR
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
            # Cas 1 : valeur sur la même ligne après ":" ou "-"
            parts = re.split(r"[:：\-]", line, maxsplit=1)
            if len(parts) == 2:
                candidate = clean_name_candidate(parts[1])
                if candidate:
                    return candidate

            # Cas 2 : valeur sur la même ligne après suppression du libellé
            candidate_same_line = line
            for keyword in label_keywords:
                candidate_same_line = re.sub(keyword, " ", candidate_same_line, flags=re.I)

            candidate = clean_name_candidate(candidate_same_line)
            if candidate:
                return candidate

            # Cas 3 : valeur sur la ligne suivante
            for j in range(i + 1, min(i + 4, len(lines))):
                next_line = lines[j]
                normalized_next = normalize_text(next_line)

                # Sauter les lignes qui sont encore des libellés
                label_words = [
                    "NOM", "NOMS", "SURNAME", "PRENOM", "PRENOMS", "GIVEN",
                    "DATE", "NAISSANCE", "BIRTH", "SEXE", "SEX", "NATIONALITE"
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
        forbidden_keywords=["PRENOM", "PRENOMS", "GIVEN", "FIRST"]
    )

    first_name = extract_value_near_identity_label(
        ocr_text,
        ["PRENOMS", "PRENOM", "GIVEN NAMES", "GIVEN NAME", "FIRST NAME", "FORENAMES"],
        forbidden_keywords=["NOMS", "SURNAME", "LAST NAME", "FAMILY NAME"]
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
# CNI_RECTO_NAME_EXTRACTION_HELPERS_END


# CNI_NOISY_RECTO_FALLBACK_START
def extract_name_words_from_noisy_line(line: str, label_patterns: list[str]) -> list[str]:
    normalized = normalize_text(line)

    # Supprimer les libellés normaux et les libellés OCR déformés
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
        "PERE", "MERE", "FATHER", "MOTHER"
    }

    clean_words = []
    for word in words:
        if word in forbidden:
            continue

        # Éviter les micro-déchets OCR comme AA, RO, RR
        if len(word) < 3:
            continue

        # Éviter des blocs trop suspects avec peu de voyelles
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
        r"\bSURAW[A-Z]*\b"
    ]

    first_name_patterns = [
        r"\bPRENOMS?\b",
        r"\bPREN[A-Z]*\b",
        r"\bGIVEN\s+NAMES?\b",
        r"\bFIRST\s+NAME\b"
    ]

    # 1. Recherche du nom/surname sur les premières lignes du document
    for line in lines[:15]:
        normalized_line = normalize_text(line)

        looks_like_surname_line = any(re.search(pattern, normalized_line, flags=re.I) for pattern in surname_patterns)

        if not looks_like_surname_line:
            continue

        words = extract_name_words_from_noisy_line(line, surname_patterns)

        # Si la ligne contient trop de mots, c'est souvent une phrase OCR bruitée : on ignore.
        if 1 <= len(words) <= 4:
            result["last_name"] = " ".join(words[:3])
            result["surname"] = result["last_name"]
            break

    # 2. Recherche du prénom uniquement si le libellé est assez clair
    # On évite de prendre des lignes trop bruitées comme "Prats I: ROX I".
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
# CNI_NOISY_RECTO_FALLBACK_END


# CAMEROON_DOC_EXTRACTION_V2_START
def v2_lines(text: str) -> list[str]:
    return [clean_text(line) for line in (text or "").splitlines() if clean_text(line)]


def v2_clean_name(value: str | None) -> str | None:
    value = clean_text(value)

    if not value:
        return None

    value = normalize_text(value)

    # Supprimer libellés normaux et variantes OCR
    # (GIVEM/G1VEN/GLVEN : déformations fréquentes de GIVEN ; NAMES seul aussi)
    value = re.sub(
        r"\b(NOMS?|SURNAME|SURNAMES|SURAAWE|SURAWE|SURNARNE|[PR]RENOMS?|RENOMS?|PRENOM|(?:GIVEN|GIVEM|G1VEN|GLVEN)\s*NAMES?|NAMES|FIRST NAME|FORENAMES?)\b",
        " ",
        value,
        flags=re.I
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
        "LIEU", "PLACE"
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

        # Valeur sur la même ligne après : ou -
        parts = re.split(r"[:：\-]", line, maxsplit=1)
        if len(parts) == 2:
            candidate = v2_clean_name(parts[1])
            if candidate:
                return candidate

        # AFB_OCR_VALUE_ADJACENT_LABEL_V1 : RapidOCR fusionne souvent plusieurs
        # zones en une seule grande ligne, avec la valeur juste AVANT son
        # libellé (sur la CNI 2024 la valeur est imprimée au-dessus du
        # libellé). On ne garde que les mots immédiatement adjacents.
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

        # Valeur sur la même ligne après suppression du libellé
        same_line = nline
        for pattern in label_patterns:
            same_line = re.sub(pattern, " ", same_line, flags=re.I)

        candidate = v2_clean_name(same_line)
        if candidate:
            return candidate

        # Valeur sur les lignes suivantes
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

        # Passeport : P<CMRBELLO<<ETIENNE<KHOLIA
        # OCR possible : POCMRBELLO<<ETIENNE<KHOLIA
        if candidate.startswith("P"):
            idx = candidate.find("CMR")
            if idx >= 0:
                candidate = candidate[idx + 3:]

        # Ancienne CNI ou autres : parfois la ligne commence directement par BELLO<<...
        if "<<" not in candidate:
            continue

        # AFB_CNI_MRZ_FUSED_LINES_V1 : RapidOCR fusionne souvent les 3 lignes
        # MRZ en une seule (« 9911053M...<<<<7I<CMR...<<<<<YEDNA<NZOGUE<<ULRICH
        # <VIANNEY<< »). Le segment des noms est celui dont la partie gauche
        # ne contient AUCUN chiffre : on choisit ce candidat plutôt que le
        # premier « << » rencontré.
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

        # Nettoyer préfixes parasites
        left = re.sub(r"^(IDCMR|CMR|I?DCMR|P<CMR|POCMR)", "", left)
        left = re.sub(r"[^A-Z<]", "", left).replace("<", " ")

        # AFB_CNI_CORPUS_TUNING_V2 : la partie droite s'arrête au premier
        # segment contenant des chiffres (lignes MRZ suivantes fusionnées),
        # et les débris « CMR » sont écartés.
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

    # 1. MRZ d'abord : souvent le plus fiable
    mrz_names = v2_parse_name_from_mrz(text)
    result.update(mrz_names)

    lines = v2_lines(text)

    # 2. Libellés visibles
    if not result.get("last_name"):
        last_name = v2_extract_label_value(
            lines,
            [
                r"\bNOM\s*/?\s*SURNAME\b",
                # AFB_CNI_SIDE_AWARE_V1 : ne jamais confondre le NOM du
                # titulaire avec « NOM DU PERE » / « NOM DE LA MERE » du verso.
                r"\bNOMS?\b(?!\s*(?:DU\s*PERE|DE\s*LA\s*MERE|DU|DE\s*LA)\b)",
                r"\bSURNAME\b",
                r"\bSURNAMES\b",
                r"\bSURAAWE\b",
                r"\bSURAWE\b",
                r"\bSURNARNE\b"
            ]
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
                # AFB_CNI_CORPUS_TUNING_V1 : variantes OCR observées sur le
                # corpus : « RENOMS/GIVEN NAMES » (P perdu), « JYIN NAMI »
                # (GIVEN NAMES très dégradé).
                r"\bRENOMS?\b",
                r"\b[GJ][A-Z]{0,3}N\s+NAM[EI]S?\w*\b"
            ]
        )

        if first_name:
            result["first_name"] = first_name
            result["given_names"] = first_name

    # 3. Fallback spécial CNI bruitée :
    # chercher une ligne contenant Suraawe / Surawe / Surname et prendre le meilleur mot après
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


# AFB_CNI_SIDE_AWARE_V1 — bande MRZ TD1 de l'ancienne CNI (verso).
# Ligne 2 : AAMMJJ + clé + sexe + AAMMJJ (expiration) + clé + nationalité.
# Exemple OCR réel : « 9911053m3511037cMR<<<<<<<<<<<7 » -> naissance 05/11/1999,
# sexe M, expiration 03/11/2035. Source la plus fiable du verso.
def v2_parse_mrz_td1(text: str) -> dict[str, str]:
    result: dict[str, str] = {}

    def century(yy: int, is_birth: bool) -> int:
        if is_birth:
            return 1900 + yy if yy > 30 else 2000 + yy
        return 2000 + yy

    for raw_line in (text or "").splitlines():
        compact = re.sub(r"[^A-Z0-9<]", "", raw_line.upper())

        m = re.search(r"(\d{2})(\d{2})(\d{2})\d([MF])(\d{2})(\d{2})(\d{2})\d", compact)
        if m:
            by, bm, bd = int(m.group(1)), int(m.group(2)), int(m.group(3))
            ey, em, ed = int(m.group(5)), int(m.group(6)), int(m.group(7))

            if 1 <= bm <= 12 and 1 <= bd <= 31:
                result["birth_date"] = f"{bd:02d}/{bm:02d}/{century(by, True)}"
            if 1 <= em <= 12 and 1 <= ed <= 31:
                result["identity_expiry_date"] = f"{ed:02d}/{em:02d}/{century(ey, False)}"

            result["sex"] = m.group(4)

        # Ligne 1 : I<CMR + numéro de document (9 chiffres + clé).
        m = re.search(r"I?[<D]?CMR(\d{9})", compact)
        if m and "cni_number" not in result:
            result["cni_number"] = m.group(1)

    return result


# AFB_CNI_SIDE_AWARE_V1 — noms du père et de la mère (verso).
# RapidOCR imprime souvent la valeur AVANT son libellé sur la même ligne :
# « YEDNA ADELE MARIE SOLANGE NOMDE LA MERE/MOTHER'S NAME ».
def v2_extract_parent_names(text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    lines = v2_lines(text)

    targets = [
        ("mother_full_name", r"NOM\s*DE\s*LA\s*MERE|NOMDE\s*LA\s*MERE|MOTHER'?S?\s*NAME|M[0O]THER"),
        ("father_full_name", r"NOM\s*DU\s*PERE|NOMDU\s*PERE|FATHER'?S?\s*NAME|FATHER"),
    ]

    for key, pattern in targets:
        for line in lines:
            nline = normalize_text(line)
            m = re.search(pattern, nline, flags=re.I)
            if not m:
                continue

            # Mots immédiatement avant le libellé (jusqu'à 4), sans déborder
            # sur le libellé précédent (père/mère se suivent souvent).
            before = nline[:m.start()]
            before = re.split(r"NAME|MERE|PERE|MOTHER|FATHER|S\s*P\s*S\s*M", before, flags=re.I)[-1]
            candidate = v2_clean_name(" ".join(before.split()[-4:]))

            if not candidate:
                after = nline[m.end():]
                candidate = v2_clean_name(" ".join(after.split()[:4]))

            if candidate:
                result[key] = candidate
                break

    return result


# AFB_CNI_SIDE_AWARE_V1 — reconnaître de quel côté de la CNI provient le texte,
# indépendamment de ce que l'utilisateur a déclaré (recto photographié comme
# verso et inversement : cas fréquents observés dans le corpus réel).
def detect_cni_side(ocr_text: str) -> dict[str, Any]:
    t = normalize_text(ocr_text or "")
    compact = t.replace(" ", "")

    recto_score = 0
    verso_score = 0
    signals: list[str] = []

    def hit(side: str, points: int, label: str):
        nonlocal recto_score, verso_score
        if side == "R":
            recto_score += points
        else:
            verso_score += points
        signals.append(f"{'recto' if side == 'R' else 'verso'}:{label}")

    if re.search(r"NOM\s*/?\s*SURNAME|SURNAME", t):
        hit("R", 25, "nom_surname")
    if re.search(r"PRENOM|GIVEN\s*NAME|RENOMS", t):
        hit("R", 25, "prenoms")
    if re.search(r"NAISSANCE|BIRTH", t) and not re.search(r"LIEU|PLACE", t):
        hit("R", 10, "naissance")
    if re.search(r"SEXE|SEX\b", t):
        hit("R", 10, "sexe")
    if re.search(r"CARTE\s*NATIONALE|NATIONAL\s*IDENTITY|IDENTITY\s*CAR", t):
        hit("R", 10, "titre_carte")

    if "<<" in (ocr_text or ""):
        hit("V", 40, "mrz")
    if re.search(r"DELIVRANCE|DATE\s*OF\s*ISSUE|DELI[VY]RAN", t):
        hit("V", 30, "delivrance")
    if re.search(r"PERE|MERE|FATHER|MOTHER", t):
        hit("V", 30, "parents")
    if re.search(r"POSTE\s*D\s*IDENTIFICATION|IDENTIFICATION\s*POST|AUTORITE|AUTHORIT", t):
        hit("V", 20, "autorite")
    if re.search(r"MBARGA\s*NGUELE", t):
        hit("V", 20, "signature_dgsn")
    if re.search(r"(?<!\d)20\d{15}(?!\d)", compact):
        hit("V", 20, "identifiant_unique")
    if re.search(r"ADRESSE|ADDRESS", t):
        hit("V", 10, "adresse")

    if recto_score == 0 and verso_score == 0:
        detected = "UNKNOWN"
    elif recto_score >= verso_score + 15:
        detected = "RECTO"
    elif verso_score >= recto_score + 15:
        detected = "VERSO"
    else:
        detected = "UNKNOWN"

    return {
        "detected_side": detected,
        "recto_score": recto_score,
        "verso_score": verso_score,
        "signals": signals,
    }


def v2_extract_dates(text: str) -> list[str]:
    dates = extract_dates(text)

    # Dates avec mois texte : 31 JUIL/JUL 1996, 26 OCT/OCT 2020
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
        "DEC": "12"
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

        matched_keyword = next((k for k in keywords if k in nline), None)
        if not matched_keyword:
            continue

        # AFB_CNI_CORPUS_TUNING_V2 : RapidOCR fusionne plusieurs zones en une
        # seule ligne (« 03.11.2035 DATE OF EXPIRY 05.11.1999 DATEDENAISSANCE »).
        # Quand le libellé et plusieurs dates cohabitent sur la ligne, prendre
        # la date la plus proche AVANT le libellé (la valeur est imprimée
        # au-dessus de son libellé), sinon la plus proche après.
        keyword_pos = nline.find(matched_keyword)
        same_line_dates = []
        for m in re.finditer(r"\b(\d{2})[./\s-](\d{2})[./\s-](\d{4})\b", nline):
            same_line_dates.append((m.start(), f"{m.group(1)}/{m.group(2)}/{m.group(3)}"))

        if same_line_dates:
            before = [d for d in same_line_dates if d[0] < keyword_pos]
            if before:
                return before[-1][1]
            return same_line_dates[0][1]

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
        r"\bPASSEPORT\s*[:\-]?\s*([A-Z0-9]{5,15})"
    ]

    for pattern in patterns:
        m = re.search(pattern, normalized)
        if m:
            return m.group(1)

    # MRZ passeport : seconde ligne commence souvent par numéro de passeport
    for line in v2_extract_mrz_lines(text):
        if re.match(r"^[A-Z0-9]{6,12}<", line):
            value = line.split("<", 1)[0]
            value = re.sub(r"[^A-Z0-9]", "", value)

            if len(value) >= 6:
                return value

    # OCR courant : ligne contenant seulement ou presque le numéro
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
        # AFB_CNI_2024_IDENTIFIANT_UNIQUE_V1 : libellé de la nouvelle CNI.
        r"\bIDENTIFIANT\s+UNIQUE\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bUNIQUE\s+IDENTIFIER\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bCNI\s*[:\-]?\s*([A-Z0-9]{6,20})",
        r"\bN[°O]\s*[:\-]?\s*([A-Z0-9]{6,20})"
    ]

    for pattern in patterns:
        m = re.search(pattern, normalized)
        if m:
            value = m.group(1)
            # AFB_CNI_CORPUS_TUNING_V2 : un numéro de CNI contient forcément
            # des chiffres — écarte les libellés happés (« NOM DE LA MERE »).
            if sum(1 for c in value if c.isdigit()) >= 4:
                return value

    # Ancienne CNI MRZ : IDCMR1159672694...
    for line in v2_extract_mrz_lines(text):
        m = re.search(r"(?:IDCMR|DCMR|ICMR|I<CMR|ICMR|CMR)([0-9]{8,12})", line)
        if m:
            value = m.group(1)

            # On garde souvent les 9 premiers chiffres utiles
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

            # AFB_OCR_SAMELINE_VALUE_V1 : valeur sur la même ligne, sans « : »
            # (cas CNI courant : « LIEU DE NAISSANCE/PLACE OF BIRTH YAOUNDE »).
            # On retire les libellés (FR et EN) et les séparateurs ; le reste
            # est la valeur.
            residue = nline
            for pattern in label_patterns:
                residue = re.sub(pattern, " ", residue, flags=re.I)
            residue = re.sub(r"[/|]", " ", residue)
            # AFB_CNI_CORPUS_TUNING_V1 : écarter les débris de libellés
            # fusionnés (« PCACEOFRRTH ») qui restent collés à la valeur.
            residue = " ".join(
                word for word in residue.split()
                if not re.search(r"ACE|BIRTH|RRTH|NAISSANCE|SEX|TAILLE|HEIGHT|DATE|SIGNAT", word, flags=re.I)
            )
            residue = clean_text(residue)

            if residue and 2 <= len(residue) <= 40:
                return residue.upper()

            # Ligne suivante
            for j in range(i + 1, min(i + 3, len(lines))):
                value = clean_text(lines[j])
                if not value:
                    continue
                # Ne pas prendre une ligne de libellés pour une valeur.
                if re.search(r"SEX|TAILLE|HEIGHT|DATE|SIGNAT|PROFESS|OCCUPAT|NATIONALIT", normalize_text(value)):
                    continue
                # AFB_CNI_CORPUS_TUNING_V2 : ni une ligne MRZ ni un bloc
                # numérique, ni une ligne démesurée.
                if "<" in value or re.search(r"\d{6,}", value) or len(value) > 40:
                    continue
                return value.upper()

    return None


def v2_extract_identity_fields(account_type: str, document_type: str, ocr_text: str) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    normalized_doc = normalize_text(document_type)
    normalized_text = normalize_text(ocr_text)

    # AFB_MRZ_ICAO9303_PRIORITY_V1
    # La MRZ validée par clé de contrôle est bien plus fiable qu'une lecture par
    # mots-clés sur un OCR bruité : quand un champ est validé, il prime sur
    # l'extraction heuristique faite plus bas dans cette fonction.
    mrz = parse_mrz_icao9303(ocr_text)
    mrz_fields = mrz.get("fields", {}) if mrz.get("mrz_detected") else {}

    if mrz.get("mrz_detected"):
        fields["mrz_checksum_validated_fields"] = mrz.get("mrz_checksum_validated_fields", [])
        fields["mrz_format"] = mrz.get("mrz_format")

    dates = v2_extract_dates(ocr_text)

    if dates:
        fields["possible_dates"] = dates

    names = v2_extract_names(ocr_text)
    fields.update(names)

    # AFB_CNI_SIDE_AWARE_V1 : la bande MRZ (verso ancienne CNI) est la source
    # la plus fiable — elle complète naissance, sexe, expiration et numéro.
    mrz = v2_parse_mrz_td1(ocr_text)
    for key in ("birth_date", "sex", "identity_expiry_date", "cni_number"):
        if mrz.get(key) and not fields.get(key):
            fields[key] = mrz[key]

    if mrz.get("cni_number"):
        fields.setdefault("identity_document_number", mrz["cni_number"])

    # Noms du père et de la mère (verso).
    parents = v2_extract_parent_names(ocr_text)
    fields.update(parents)

    birth_date = v2_find_date_near_keywords(
        ocr_text,
        [
            "DATE DE NAISSANCE",
            "DATE OF BIRTH",
            "BIRTH",
            "NE LE",
            "NEE LE",
            "DOB",
            # AFB_OCR_NOISY_LABELS_V1 : l'OCR colle souvent les libellés
            # (« DAYEDENAISSANCE ») — le mot seul suffit en sous-chaîne.
            "NAISSANCE"
        ]
    )

    issue_date = v2_find_date_near_keywords(
        ocr_text,
        [
            "DATE DE DELIVRANCE",
            "DATE OF ISSUE",
            "DELIVRANCE",
            "ISSUE",
            # AFB_CNI_CORPUS_TUNING_V1 : « DATEDEDELIYRAN » (V lu Y, fusion).
            "DELI"
        ]
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
            # AFB_CNI_CORPUS_TUNING_V1 : « DATEOFEXPI », « DATEDEXS » (fusion).
            "EXPI",
            "DATEDEX"
        ]
    )

    # AFB_CNI_CORPUS_TUNING_V2 : plausibilité — une date de naissance est
    # forcément passée d'au moins ~10 ans (évite de prendre une date de
    # délivrance/expiration quand les libellés sont détruits).
    if birth_date:
        try:
            birth_year = int(str(birth_date).split("/")[-1])
            from datetime import datetime as _dt
            if not (1900 <= birth_year <= _dt.now().year - 10):
                birth_date = None
        except Exception:
            pass

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
            r"\bNATIONALITY\b"
        ]
    )

    if nationality:
        fields["nationality"] = nationality

    place_of_birth = v2_extract_simple_value(
        ocr_text,
        [
            r"\bLIEU\s+DE\s+NAISSANCE\b",
            r"\bPLACE\s+OF\s+BIRTH\b",
            # AFB_CNI_CORPUS_TUNING_V1 : libellés fusionnés/dégradés observés
            # (« LI DENAISSANCEPCACEOFRRTH ») — le mot NAISSANCE collé à une
            # variante de PLACE suffit à identifier le libellé du lieu.
            r"L\w{0,2}\s*DE\s*NAISSANCE\w*[PC][CLR]?ACE",
            r"NAISSANCE\w*[PC][CLR]?ACE\w*OF",
            r"PLACEOF\w*[BR]\w*TH"
        ]
    )

    if place_of_birth:
        fields["place_of_birth"] = place_of_birth

    occupation = v2_extract_simple_value(
        ocr_text,
        [
            r"\bPROFESSION\b",
            r"\bOCCUPATION\b"
        ]
    )

    # AFB_OCR_NOISY_LABELS_V1 : rejeter les valeurs qui sont en réalité des
    # résidus du libellé de la carte (« CARTE NATIONALE D'IDENTITE » collé).
    if occupation and not re.search(
        r"IDENTIT|NATIONALE|NATIONAL\s*ID|REPUBLI", normalize_text(occupation)
    ):
        fields["profession"] = occupation

    # AFB_CNI_CORPUS_TUNING_V1 : sexe — un M ou F isolé près d'un libellé
    # SEXE/SEX, même très dégradé (« SENCSEX TAILLE/SHE » puis « M 1,76 »).
    sex_lines = v2_lines(ocr_text)
    for i, line in enumerate(sex_lines):
        nline = normalize_text(line)
        if not re.search(r"\bSEXE?\b|SEXESEX|SE[NX]CSEX|SEXE\s*SEX|\bSEX\b", nline):
            continue

        window = normalize_text(" ".join(sex_lines[i:i + 3]))
        m = re.search(r"(?:^|\s)([MF])(?:\s|$)", window)
        if m:
            fields["sex"] = m.group(1)
        break

    # Numéros document
    if "PASSPORT" in normalized_doc or "PASSEPORT" in normalized_doc or "PASSPORT" in normalized_text:
        passport_number = v2_extract_passport_number(ocr_text)

        if passport_number:
            fields["passport_number"] = passport_number
            fields["identity_document_number"] = passport_number

    cni_number = v2_extract_cni_number(ocr_text)

    # AFB_CNI_NUMBER_FALLBACK_NO_LABEL_V1 : sur les scans bruités les libellés
    # (« NIC NUMBER », « IDENTIFIANT UNIQUE ») sont détruits par l'OCR. Pour un
    # document explicitement CNI, on repêche le numéro sans libellé :
    # - identifiant unique nouvelle CNI (2024) : 17 chiffres commençant par 20 ;
    # - ancienne CNI : un nombre isolé de 9 chiffres, uniquement s'il est le
    #   seul candidat (on ne devine pas entre plusieurs).
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

    # AFB_MRZ_ICAO9303_OVERLAY_V1
    # On ne fait confiance au nom/sexe/nationalité lus dans la MRZ que si au
    # moins un champ numérique (date, numéro de document) a passé sa clé de
    # contrôle : ça confirme que l'OCR a bien lu ce bloc MRZ, pas seulement
    # qu'il ressemble à de la MRZ.
    if mrz_fields and mrz.get("mrz_checksum_validated_fields"):
        if mrz_fields.get("last_name"):
            fields["last_name"] = mrz_fields["last_name"]
            fields["surname"] = mrz_fields["last_name"]
        if mrz_fields.get("first_name"):
            fields["first_name"] = mrz_fields["first_name"]
            fields["given_names"] = mrz_fields["first_name"]
        if mrz_fields.get("sex"):
            fields["sex"] = mrz_fields["sex"]
        if mrz_fields.get("nationality"):
            fields["nationality"] = mrz_fields["nationality"]
        if fields.get("last_name") and fields.get("first_name"):
            fields["full_name"] = clean_text(f"{fields['last_name']} {fields['first_name']}")

    if mrz_fields.get("birth_date"):
        fields["birth_date"] = mrz_fields["birth_date"]

    if mrz_fields.get("document_number"):
        fields["identity_document_number"] = mrz_fields["document_number"]

    if mrz_fields.get("expiry_date"):
        fields["identity_expiry_date"] = mrz_fields["expiry_date"]

    return fields
# CAMEROON_DOC_EXTRACTION_V2_END

def extract_prefill_fields(account_type: str, document_type: str, ocr_text: str) -> dict[str, Any]:
    normalized_doc = normalize_text(document_type)
    account_type = normalize_text(account_type)
    identity_doc = is_identity_document(document_type)

    fields: dict[str, Any] = {}

    # Documents d'identité : CNI / passeport / pièce représentant légal
    if identity_doc or "PASSPORT" in normalize_text(ocr_text) or "PASSEPORT" in normalize_text(ocr_text):
        fields.update(v2_extract_identity_fields(account_type, document_type, ocr_text))

    # Dates générales si pas encore présentes
    dates = v2_extract_dates(ocr_text)
    if dates and "possible_dates" not in fields:
        fields["possible_dates"] = dates

    # Email et téléphone seulement hors document d'identité
    email = extract_email(ocr_text)
    if email and not identity_doc:
        fields["email"] = email

    phone = extract_phone(ocr_text, allow_generic=not identity_doc)
    if phone:
        fields["phone"] = phone

    # NIU / numéro fiscal
    niu = extract_niu_or_tax_number(ocr_text)
    if niu:
        fields["tax_identification_number"] = niu
        fields["niu"] = niu

    # RIB / IBAN
    if "RIB" in normalized_doc or "BANK" in normalized_doc:
        rib = extract_rib_or_iban(ocr_text)
        if rib:
            fields["rib"] = rib
            fields["iban_or_account_number"] = rib

    # Entreprise
    if account_type == "BUSINESS":
        rccm = extract_rccm(ocr_text)
        company = guess_company_name(ocr_text)

        if rccm:
            fields["rccm"] = rccm

        if company:
            fields["company_name"] = company

    return fields

# AFB_OCR_FIELDS_SERVER_PERSIST_V1 : les champs extraits par OCR sont aussi
# conservés côté serveur (par session) pour que le préremplissage du formulaire
# fonctionne même quand le localStorage est absent (autre appareil, navigation
# privée, cache vidé).
def persist_session_ocr_fields(session_id: str, document_type: str, fields: dict) -> None:
    from pathlib import Path
    from datetime import datetime
    import os
    import re
    import json

    safe = re.sub(r"[^A-Za-z0-9_-]", "_", str(session_id or "").strip())[:80]
    if not safe:
        return

    upload_root = Path(os.getenv("PRE_ONBOARDING_UPLOAD_DIR", "uploads/pre_onboarding"))
    target_dir = upload_root / safe
    target_dir.mkdir(parents=True, exist_ok=True)

    path = target_dir / "ocr_fields.json"

    data = {}
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8")) or {}
        except Exception:
            data = {}

    merged = data.get("fields") or {}
    for key, value in (fields or {}).items():
        if value not in (None, "", []):
            merged[key] = value

    data["fields"] = merged
    by_document = data.get("by_document") or {}
    by_document[str(document_type or "UNKNOWN")] = fields
    data["by_document"] = by_document
    data["updated_at"] = datetime.utcnow().isoformat() + "Z"

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


@router.post("/ocr")
async def pre_onboarding_ocr(
    account_type: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    session_id: str = Form(None)
):
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide.")

    mime_type = file.content_type or "application/octet-stream"

    try:
        ocr_result = await run_in_threadpool(extract_text_with_best_engine, content, mime_type)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur OCR temporaire : {exc}"
        )

    ocr_text = ocr_result.get("text", "") or ""
    document_type_validation = validate_document_type_against_ocr(document_type, ocr_text)

    # AFB_PREONBOARDING_RIB_BACKOFFICE_GUARD_V1
    # Un vrai RIB peut contenir "RIB" ou "numéro de compte", mais une capture back-office
    # peut aussi contenir ces mots. Cette règle évite de valider une capture d'écran interne
    # comme justificatif bancaire réel.
    normalized_ocr_for_guard = normalize_text(ocr_text or "")
    normalized_document_type_for_guard = normalize_text(document_type or "")

    rib_backoffice_signals = [
        "back office",
        "back-office",
        "informations d ouverture de compte",
        "information d ouverture de compte",
        "message au client",
        "enregistrer la decision",
        "enregistrer la décision",
        "notification whatsapp",
        "simulation",
        "votre dossier est conforme",
        "dossier est conforme",
        "rib final afriland",
        "saisir ou coller le rib",
        "saisir ou coller le rlb",
        "compte a ete ouvert",
        "compte a été ouvert",
    ]

    if "RIB_DOCUMENT" in str(document_type or "").upper():
        hits = [s for s in rib_backoffice_signals if normalize_text(s) in normalized_ocr_for_guard]
        if hits:
            document_type_validation = {
                "status": "DOCUMENT_TYPE_MISMATCH",
                "expected_category": "RIB",
                "detected_category": "INTERNAL_BACKOFFICE_SCREEN",
                "confidence": 98,
                "signals": hits,
                "message": "Le fichier contient des indices d'écran back-office interne, pas un RIB bancaire client exploitable."
            }

    # AFB_STAFF_BADGE_GUARD_V1 : un badge d'employé (« Matricule », logo
    # banque) contient Nom/Prénom et passait pour une pièce d'identité.
    # Sans marqueur fort d'une vraie pièce, on le signale explicitement.
    identity_doc_expected = any(
        marker in str(document_type or "").upper()
        for marker in ("CNI", "PASSPORT", "IDENTITY", "RESIDENCE", "CONSULAR")
    )
    if identity_doc_expected and document_type_validation.get("status") != "DOCUMENT_TYPE_MISMATCH":
        badge_hits = [
            s for s in ("matricule", "afriland first bank", "first agent", "badge")
            if normalize_text(s) in normalized_ocr_for_guard
        ]
        strong_identity_marker = re.search(
            r"REPUBLIQUE|REPUBLIC|CARTE\s*NATIONALE|IDENTITY\s*CARD|PASSEPORT|PASSPORT|NATIONALIT|DELIVRANCE|<<",
            normalize_text(ocr_text or ""),
            flags=re.I,
        )
        if badge_hits and not strong_identity_marker:
            document_type_validation = {
                "status": "DOCUMENT_TYPE_MISMATCH",
                "expected_category": "IDENTITY",
                "detected_category": "STAFF_BADGE",
                "confidence": 90,
                "signals": badge_hits,
                "message": "Le fichier ressemble à un badge professionnel, pas à la pièce d'identité attendue.",
            }

    extracted_fields = extract_prefill_fields(account_type, document_type, ocr_text)

    # AFB_CNI_SIDE_AWARE_V1 : reconnaître le côté réellement photographié
    # (les inversions recto/verso sont fréquentes dans le corpus réel).
    document_side = None
    if "CNI" in str(document_type or "").upper():
        side = detect_cni_side(ocr_text)
        declared = "RECTO" if "RECTO" in str(document_type).upper() else "VERSO"

        side_status = "SIDE_UNKNOWN"
        side_message = None

        if side["detected_side"] != "UNKNOWN":
            if side["detected_side"] == declared:
                side_status = "SIDE_MATCH"
            else:
                side_status = "SIDE_MISMATCH"
                side_message = (
                    "Cette photo ressemble au "
                    + ("recto" if side["detected_side"] == "RECTO" else "verso")
                    + " de la CNI alors que le "
                    + ("recto" if declared == "RECTO" else "verso")
                    + " était attendu. Vérifiez le côté photographié."
                )

        document_side = {
            "declared": declared,
            "detected": side["detected_side"],
            "status": side_status,
            "message": side_message,
            "recto_score": side["recto_score"],
            "verso_score": side["verso_score"],
        }

    # AFB_OCR_FIELDS_SERVER_PERSIST_V1
    if session_id and extracted_fields:
        try:
            persist_session_ocr_fields(session_id, document_type, extracted_fields)
        except Exception:
            pass

    return {
        "status": "OK",
        "document_side": document_side,
        "account_type": account_type,
        "document_type": document_type,
        "filename": file.filename,
        "mime_type": mime_type,
        "ocr_status": ocr_result.get("ocr_status"),
        "ocr_message": ocr_result.get("message"),
        "ocr_language": ocr_result.get("language"),
        "text_length": len(ocr_text),
        "text_preview": ocr_text[:1200],
        "document_type_validation": document_type_validation,
        "document_type_validation_status": document_type_validation.get("status"),
        "document_type_expected": document_type_validation.get("expected_category"),
        "document_type_detected": document_type_validation.get("detected_category"),
        "extracted_fields": extracted_fields
    }

# PREONBOARDING_SAVE_FILE_ENDPOINT_V1
from fastapi import UploadFile, File, Form, HTTPException

@router.post("/save-file")
async def save_pre_onboarding_file(
    session_id: str = Form(...),
    account_type: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...)
):
    from pathlib import Path
    from datetime import datetime
    import os
    import re
    import uuid
    import json

    def clean(value: str, default: str = "unknown") -> str:
        value = (value or "").strip()
        value = re.sub(r"[^A-Za-z0-9_-]", "_", value)
        return value[:80] or default

    session_safe = clean(session_id, "session")
    account_safe = clean(account_type, "account")
    document_safe = clean(document_type, "document")

    upload_root = Path(os.getenv("PRE_ONBOARDING_UPLOAD_DIR", "uploads/pre_onboarding"))
    target_dir = upload_root / session_safe
    target_dir.mkdir(parents=True, exist_ok=True)

    original_name = file.filename or "capture"
    suffix = Path(original_name).suffix.lower()

    allowed_suffixes = {
        ".jpg", ".jpeg", ".png", ".webp",
        ".pdf", ".mp4", ".webm", ".mov"
    }

    if suffix not in allowed_suffixes:
        suffix = ".bin"

    pre_document_id = uuid.uuid4().hex
    stored_name = f"{document_safe}_{pre_document_id}{suffix}"
    target_path = target_dir / stored_name

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide")

    max_size = 60 * 1024 * 1024

    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux")

    target_path.write_bytes(content)

    metadata = {
        "pre_document_id": pre_document_id,
        "session_id": session_safe,
        "account_type": account_safe,
        "document_type": document_safe,
        "original_name": original_name,
        "stored_name": stored_name,
        "relative_path": str(target_path),
        "content_type": file.content_type,
        "size": len(content),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "status": "TEMP_SAVED"
    }

    metadata_path = target_dir / f"{document_safe}_{pre_document_id}.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    # AFB_FACE_MATCH_V1 : dès que la vidéo client est enregistrée, elle est
    # comparée aux photos de référence de la session (portrait CNI, photo
    # client) par reconnaissance faciale locale (YuNet + SFace).
    if "CLIENT_VIDEO" in document_safe.upper():
        try:
            from app.services.face_match_service import run_session_face_match
            metadata["face_match"] = run_session_face_match(target_dir)
        except Exception as exc:
            metadata["face_match"] = {"status": "ERROR", "error": str(exc)}

    return metadata


# AFB_FACE_MATCH_V1 : détection de visage en direct (aperçu caméra) — la page
# vidéo envoie une petite frame et démarre l'enregistrement dès qu'un visage
# est réellement détecté (plus de délai fixe).
@router.post("/face-detect")
async def pre_onboarding_face_detect(file: UploadFile = File(...)):
    import numpy as _np
    import cv2 as _cv2
    from app.services.face_match_service import models_available, detect_largest_face

    if not models_available():
        return {"ok": False, "status": "MODELS_MISSING", "face": False}

    content = await file.read()
    if not content:
        return {"ok": False, "status": "EMPTY", "face": False}

    image = _cv2.imdecode(_np.frombuffer(content, dtype=_np.uint8), _cv2.IMREAD_COLOR)
    if image is None:
        return {"ok": False, "status": "UNREADABLE", "face": False}

    face = detect_largest_face(image)

    return {
        "ok": True,
        "face": face is not None,
        "score": round(float(face[14]), 3) if face is not None else 0.0,
    }


# AFB_FACE_MATCH_V1 : relance manuelle de la comparaison faciale d'une session.
@router.post("/face-match/{session_id}")
async def pre_onboarding_face_match(session_id: str):
    from pathlib import Path as _Path2
    import os as _os
    import re as _re
    from app.services.face_match_service import run_session_face_match

    safe = _re.sub(r"[^A-Za-z0-9_-]", "_", str(session_id or "").strip())[:80]
    if not safe:
        raise HTTPException(status_code=400, detail="session_id requis.")

    session_dir = _Path2(_os.getenv("PRE_ONBOARDING_UPLOAD_DIR", "uploads/pre_onboarding")) / safe
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session introuvable.")

    return run_session_face_match(session_dir)


# PREONBOARDING_SESSION_READ_ENDPOINT_V1
@router.get("/session/{session_id}")
async def get_pre_onboarding_session(session_id: str):
    from pathlib import Path
    import os
    import re
    import json

    def clean(value: str, default: str = "session") -> str:
        value = (value or "").strip()
        value = re.sub(r"[^A-Za-z0-9_-]", "_", value)
        return value[:80] or default

    session_safe = clean(session_id)

    upload_root = Path(os.getenv("PRE_ONBOARDING_UPLOAD_DIR", "uploads/pre_onboarding"))
    target_dir = upload_root / session_safe

    if not target_dir.exists():
        return {
            "session_id": session_safe,
            "exists": False,
            "documents_count": 0,
            "documents": []
        }

    documents = []

    for metadata_file in sorted(target_dir.glob("*.json")):
        # AFB_OCR_FIELDS_SERVER_PERSIST_V1 / AFB_FACE_MATCH_V1 : fichiers
        # techniques de la session, pas des documents client.
        if metadata_file.name in ("ocr_fields.json", "face_match.json"):
            continue

        try:
            metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
            documents.append(metadata)
        except Exception:
            continue

    # AFB_OCR_FIELDS_SERVER_PERSIST_V1 : champs extraits exposés au formulaire.
    extracted_fields = {}
    ocr_fields_path = target_dir / "ocr_fields.json"
    if ocr_fields_path.exists():
        try:
            extracted_fields = (
                json.loads(ocr_fields_path.read_text(encoding="utf-8")) or {}
            ).get("fields") or {}
        except Exception:
            extracted_fields = {}

    # AFB_FACE_MATCH_V1 : dernier résultat de comparaison faciale de la session.
    face_match = None
    face_match_path = target_dir / "face_match.json"
    if face_match_path.exists():
        try:
            face_match = json.loads(face_match_path.read_text(encoding="utf-8"))
        except Exception:
            face_match = None

    return {
        "session_id": session_safe,
        "exists": True,
        "documents_count": len(documents),
        "documents": documents,
        "extracted_fields": extracted_fields,
        "face_match": face_match
    }


# AFB_PRE_ONBOARDING_WHATSAPP_OTP_DEMO_V1
import hashlib
import asyncio
import json
import os
import time
import random
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path as _Path
from fastapi import Body
from filelock import FileLock

OTP_STORE_PATH = _Path("data/pre_onboarding_otps.json")
# Verrou inter-process : le store est un fichier JSON entier réécrit à chaque
# mise à jour, donc deux requêtes concurrentes (workers différents ou threads)
# peuvent s'écraser mutuellement sans ce verrou.
_otp_lock = FileLock(str(OTP_STORE_PATH) + ".lock")
OTP_TTL_MINUTES = int(os.getenv("PRE_ONBOARDING_OTP_TTL_MINUTES", "10"))
OTP_MAX_ATTEMPTS = int(os.getenv("PRE_ONBOARDING_OTP_MAX_ATTEMPTS", "5"))
OTP_DEMO_MODE = os.getenv("PRE_ONBOARDING_OTP_DEMO_MODE", "true").lower() in ("1", "true", "yes", "on")
OTP_SECRET = os.getenv("PRE_ONBOARDING_OTP_SECRET", "diaspora-onboarding-demo-secret-change-me")
# AFB_OTP_FALLBACK_DISPLAY_V1
# Contournement temporaire (souci de facturation Meta/Callbell) : si l'envoi
# WhatsApp échoue, le code est renvoyé au client pour affichage à l'écran.
# Mettre PRE_ONBOARDING_OTP_FALLBACK_DISPLAY=false dès que WhatsApp refonctionne.
OTP_FALLBACK_DISPLAY = os.getenv("PRE_ONBOARDING_OTP_FALLBACK_DISPLAY", "true").lower() in ("1", "true", "yes", "on")

# AFB_OTP_DELIVERY_CONFIRMED_ONLY_V2
# Callbell répond « sent » dès qu'il a ACCEPTÉ le message : ce n'est pas une
# livraison. Sans template AUTHENTICATION approuvé, Meta n'achemine pas les
# messages en texte libre hors fenêtre de service de 24 h — le message reste
# « sent » indéfiniment et le client attend un code qui n'arrivera jamais.
# On attend donc la confirmation de LIVRAISON avant de déclarer l'envoi réussi.
OTP_DELIVERY_TIMEOUT_S = float(os.getenv("PRE_ONBOARDING_OTP_DELIVERY_TIMEOUT_S", "12"))
OTP_DELIVERY_POLL_S = float(os.getenv("PRE_ONBOARDING_OTP_DELIVERY_POLL_S", "1.5"))
_DELIVERED_STATUSES = {"delivered", "read"}
_FAILED_STATUSES = {"failed", "undelivered", "rejected", "error", "expired"}


async def _confirm_whatsapp_delivery(uuid: str | None) -> tuple[bool, str]:
    """Confirme la LIVRAISON réelle du message Callbell (delivered/read).

    Renvoie (livré, dernier statut connu). Un « sent » qui ne progresse pas
    signifie : accepté par Meta, jamais remis au téléphone du client.
    """
    if not uuid:
        return False, "NO_MESSAGE_UUID"

    deadline = time.monotonic() + OTP_DELIVERY_TIMEOUT_S
    status = "sent"

    while True:
        live = await run_in_threadpool(get_callbell_message_status, uuid)
        if live.get("success"):
            status = str(live.get("status") or status or "").lower()
            if status in _DELIVERED_STATUSES:
                return True, status.upper()
            if status in _FAILED_STATUSES:
                return False, status.upper()

        if time.monotonic() >= deadline:
            return False, (status or "sent").upper()

        await asyncio.sleep(OTP_DELIVERY_POLL_S)


def _utcnow():
    return datetime.now(timezone.utc)


def _ensure_otp_store():
    OTP_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not OTP_STORE_PATH.exists():
        OTP_STORE_PATH.write_text("{}", encoding="utf-8")


def _load_otps():
    _ensure_otp_store()
    try:
        return json.loads(OTP_STORE_PATH.read_text(encoding="utf-8") or "{}")
    except Exception:
        return {}


def _save_otps(data):
    _ensure_otp_store()
    OTP_STORE_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize_phone(value):
    value = str(value or "").strip()
    value = value.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not value.startswith("+"):
        value = "+" + re.sub(r"\D", "", value)
    else:
        value = "+" + re.sub(r"\D", "", value[1:])
    return value


def _otp_hash(session_id, phone, otp):
    raw = f"{OTP_SECRET}|{session_id}|{phone}|{otp}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _public_otp_status(record):
    return {
        "sent": bool(record),
        "verified": bool(record.get("verified")) if record else False,
        "expires_at": record.get("expires_at") if record else None,
        "attempts": int(record.get("attempts") or 0) if record else 0,
        "max_attempts": OTP_MAX_ATTEMPTS,
    }


@router.post("/otp/send")
async def send_pre_onboarding_otp(payload: dict = Body(...)):
    # AFB_PRE_ONBOARDING_REAL_WHATSAPP_OTP_V2
    session_id = str(payload.get("session_id") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    country = str(payload.get("country") or payload.get("country_of_residence") or "").strip()
    phone = _normalize_phone(payload.get("phone") or payload.get("whatsapp") or payload.get("whatsapp_phone"))

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis.")

    if not phone or len(phone) < 8:
        raise HTTPException(status_code=400, detail="Numéro WhatsApp invalide.")

    otp = f"{random.randint(0, 999999):06d}"
    now = _utcnow()
    expires_at = (now + timedelta(minutes=OTP_TTL_MINUTES)).isoformat()

    record = {
        "session_id": session_id,
        "email": email,
        "country": country,
        "phone": phone,
        "otp_hash": _otp_hash(session_id, phone, otp),
        "expires_at": expires_at,
        "attempts": 0,
        "verified": False,
        "verified_at": None,
        "created_at": now.isoformat(),
        "delivery_channel": "WHATSAPP_CALLBELL",
        "whatsapp_sent": False,
        "whatsapp_delivery_status": "PENDING",
        "whatsapp_delivery_at": None,
    }

    # AFB_OTP_FALLBACK_DISPLAY_V1 : le code en clair est conservé pour pouvoir
    # l'afficher au client si la livraison WhatsApp échoue après coup.
    if OTP_FALLBACK_DISPLAY:
        record["fallback_otp"] = otp

    with _otp_lock:
        store = _load_otps()
        store[session_id] = record
        _save_otps(store)

    otp_message = (
        f"Votre code de vérification Afriland First Bank est : {otp}. "
        f"Il expire dans {OTP_TTL_MINUTES} minutes. "
        "Ne partagez pas ce code."
    )

    # AFB_OTP_CALLBELL_UUID_STATUS_V1 — appel réseau bloquant, déporté hors de l'event loop.
    # Le template Callbell approuvé injecte template_values[0] dans {{1}} :
    # on passe uniquement le code OTP, le texte complet sert de fallback texte libre.
    whatsapp_result = await run_in_threadpool(
        send_whatsapp_message, phone, otp_message, template_values=[otp]
    )

    callbell_response = whatsapp_result.get("response") or {}
    callbell_message = callbell_response.get("message") if isinstance(callbell_response, dict) else {}
    callbell_message = callbell_message or {}

    callbell_uuid = whatsapp_result.get("callbell_message_uuid") or callbell_message.get("uuid")
    callbell_status = whatsapp_result.get("callbell_message_status") or callbell_message.get("status")

    # AFB_OTP_DELIVERY_CONFIRMED_ONLY_V2 : « accepté par Callbell » ≠ « reçu par
    # le client ». On ne déclare l'envoi réussi qu'une fois la LIVRAISON
    # confirmée ; sinon on bascule sur le repli (code affiché à l'écran).
    whatsapp_accepted = bool(whatsapp_result.get("success"))

    if whatsapp_accepted:
        whatsapp_delivered, whatsapp_status = await _confirm_whatsapp_delivery(callbell_uuid)
    else:
        whatsapp_delivered = False
        whatsapp_status = str(callbell_status or whatsapp_result.get("status") or "UNKNOWN").upper()

    whatsapp_sent = whatsapp_delivered

    record["whatsapp_accepted"] = whatsapp_accepted
    record["whatsapp_sent"] = whatsapp_sent
    record["whatsapp_delivered"] = whatsapp_delivered
    record["whatsapp_delivery_status"] = whatsapp_status
    record["whatsapp_delivery_at"] = _utcnow().isoformat()
    record["whatsapp_http_status"] = whatsapp_result.get("http_status")
    record["callbell_message_uuid"] = callbell_uuid
    record["callbell_message_status"] = callbell_status

    with _otp_lock:
        store = _load_otps()
        store[session_id] = record
        _save_otps(store)

    response = {
        "ok": whatsapp_sent or OTP_DEMO_MODE,
        # AFB_OTP_DELIVERY_CONFIRMED_ONLY_V2 : le message ne parle plus d'un envoi
        # « en cours » quand Meta n'a jamais remis le message (statut figé à « sent »).
        "message": (
            "Code OTP reçu sur WhatsApp."
            if whatsapp_delivered
            else "WhatsApp n'a pas remis le code au client."
        ),
        "phone": phone,
        "expires_at": expires_at,
        "demo_mode": OTP_DEMO_MODE,
        "whatsapp_sent": whatsapp_sent,
        "whatsapp_accepted": whatsapp_accepted,
        "whatsapp_delivered": whatsapp_delivered,
        "whatsapp_delivery_status": whatsapp_status,
        "delivery": {
            "success": whatsapp_delivered,
            "accepted": whatsapp_accepted,
            "status": whatsapp_status,
            "http_status": whatsapp_result.get("http_status"),
            "provider": whatsapp_result.get("provider"),
            "callbell_message_uuid": callbell_uuid,
            "callbell_message_status": callbell_status,
        },
    }

    if OTP_DEMO_MODE:
        response["demo_otp"] = otp

    # AFB_OTP_FALLBACK_DISPLAY_V1 : envoi WhatsApp KO -> on renvoie le code
    # pour affichage à l'écran afin de ne pas bloquer le parcours client.
    if not whatsapp_sent and not OTP_DEMO_MODE and OTP_FALLBACK_DISPLAY:
        response["ok"] = True
        response["fallback_otp"] = otp
        response["fallback_display"] = True
        response["message"] = (
            "Envoi WhatsApp indisponible. Utilisez le code affiché à l'écran pour continuer."
        )

    print(
        "[PRE-ONBOARDING OTP] "
        f"session={session_id} phone={phone} "
        f"otp={otp if OTP_DEMO_MODE else '******'} "
        f"delivery={whatsapp_status} sent={whatsapp_sent} "
        f"expires_at={expires_at}"
    )

    if not whatsapp_sent and not OTP_DEMO_MODE and not OTP_FALLBACK_DISPLAY:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Impossible d'envoyer le code OTP par WhatsApp.",
                "phone": phone,
                "delivery_status": whatsapp_status,
                "http_status": whatsapp_result.get("http_status"),
            },
        )

    return response


@router.post("/otp/verify")
async def verify_pre_onboarding_otp(payload: dict = Body(...)):
    session_id = str(payload.get("session_id") or "").strip()
    phone = _normalize_phone(payload.get("phone") or payload.get("whatsapp") or payload.get("whatsapp_phone"))
    otp = re.sub(r"\D", "", str(payload.get("otp") or ""))

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis.")

    if not phone or len(phone) < 8:
        raise HTTPException(status_code=400, detail="Numéro WhatsApp invalide.")

    if len(otp) != 6:
        raise HTTPException(status_code=400, detail="Code OTP invalide.")

    with _otp_lock:
        store = _load_otps()
        record = store.get(session_id)

        if not record:
            raise HTTPException(status_code=404, detail="Aucun code OTP trouvé pour cette session.")

        if record.get("verified"):
            return {
                "ok": True,
                "verified": True,
                "message": "WhatsApp déjà vérifié.",
                "phone": record.get("phone"),
            }

        if str(record.get("phone") or "") != phone:
            raise HTTPException(status_code=400, detail="Le numéro WhatsApp ne correspond pas au code envoyé.")

        try:
            expires_at = datetime.fromisoformat(str(record.get("expires_at")))
        except Exception:
            expires_at = _utcnow() - timedelta(seconds=1)

        if expires_at < _utcnow():
            raise HTTPException(status_code=400, detail="Code OTP expiré. Veuillez demander un nouveau code.")

        attempts = int(record.get("attempts") or 0)

        if attempts >= OTP_MAX_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Nombre maximum de tentatives atteint. Demandez un nouveau code.")

        expected = str(record.get("otp_hash") or "")
        provided = _otp_hash(session_id, phone, otp)

        if not secrets.compare_digest(expected, provided):
            record["attempts"] = attempts + 1
            store[session_id] = record
            _save_otps(store)
            raise HTTPException(status_code=400, detail=f"Code OTP incorrect. Tentatives restantes : {max(0, OTP_MAX_ATTEMPTS - record['attempts'])}.")

        # AFB_OTP_VERIFY_RETURN_SESSION_AND_DATE_V1
        verified_at = _utcnow().isoformat()

        record["verified"] = True
        record["verified_at"] = verified_at
        store[session_id] = record
        _save_otps(store)

    return {
        "ok": True,
        "verified": True,
        "message": "Numéro WhatsApp vérifié.",
        "session_id": session_id,
        "phone": phone,
        "whatsapp_phone_full": phone,
        "verified_at": verified_at,
        "whatsapp_otp_verified": True,
        "whatsapp_otp_verified_at": verified_at,
    }


@router.get("/otp/status/{session_id}")
async def get_pre_onboarding_otp_status(session_id: str):
    session_id = str(session_id or "").strip()
    store = _load_otps()
    record = store.get(session_id)
    return {
        "ok": True,
        "session_id": session_id,
        "otp": _public_otp_status(record),
    }


# AFB_OTP_CALLBELL_LIVE_STATUS_ROUTE_V1
@router.get("/otp/delivery-status/{session_id}")
async def get_pre_onboarding_otp_delivery_status(session_id: str):
    session_id = str(session_id or "").strip()

    store = _load_otps()
    record = store.get(session_id)

    if not record:
        raise HTTPException(status_code=404, detail="Aucun OTP trouvé pour cette session.")

    uuid = record.get("callbell_message_uuid")

    live_status = None

    if uuid:
        live_status = get_callbell_message_status(uuid)

        if live_status.get("success"):
            record["callbell_live_status"] = live_status.get("status")
            record["callbell_live_errors"] = live_status.get("errors") or []
            record["whatsapp_delivery_status"] = str(live_status.get("status") or record.get("whatsapp_delivery_status") or "").upper()
            store[session_id] = record
            _save_otps(store)

    payload = {
        "ok": True,
        "session_id": session_id,
        "phone": record.get("phone"),
        "whatsapp_delivery_status": record.get("whatsapp_delivery_status"),
        "whatsapp_http_status": record.get("whatsapp_http_status"),
        "callbell_message_uuid": uuid,
        "callbell_message_status": record.get("callbell_message_status"),
        "callbell_live_status": record.get("callbell_live_status"),
        "callbell_live_errors": record.get("callbell_live_errors") or [],
        "live": live_status,
    }

    # AFB_OTP_FALLBACK_DISPLAY_V1 : la livraison a échoué après acceptation
    # par Callbell -> exposer le code pour affichage à l'écran.
    delivery_failed = str(payload["whatsapp_delivery_status"] or "").upper() in {
        "FAILED", "ERROR", "REJECTED", "UNDELIVERED",
        "CALLBELL_HTTP_ERROR", "CALLBELL_ERROR", "CALLBELL_NOT_ACCEPTED",
    }
    if (
        OTP_FALLBACK_DISPLAY
        and delivery_failed
        and not record.get("verified")
        and record.get("fallback_otp")
    ):
        payload["fallback_otp"] = record["fallback_otp"]
        payload["fallback_display"] = True

    return payload


# AFB_PREONBOARDING_RAPIDOCR_DOC_TYPE_VALIDATION_V1

# AFB_PREONBOARDING_RETURN_DOC_VALIDATION_V1
