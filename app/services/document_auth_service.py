import json
import os
import re
import subprocess
import unicodedata
from difflib import SequenceMatcher
from io import BytesIO
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet

# Le fichier .fernet_key est créé dans la racine du projet, pas dans un dossier dépendant
# du terminal courant. En production, utiliser plutôt une variable d'environnement ou un coffre-fort.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
FERNET_KEY_FILE = PROJECT_ROOT / ".fernet_key"

# Chemin Tesseract — défini uniquement via variable d'environnement TESSERACT_CMD.
# Ne jamais mettre de chemin absolu en dur ici : ça casserait Docker/Linux/CI.
#
# Utilisation :
#   Windows dev  : set TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
#   Docker/Linux : Tesseract est dans le PATH, aucune variable nécessaire.
#   Production   : définir TESSERACT_CMD= vide ou ne pas la définir.
#
# Fallbacks automatiques dans configure_tesseract() :
#   1. TESSERACT_CMD (variable d'environnement — toujours prioritaire)
#   2. Chemins Windows standards (Program Files, Program Files x86)
#   3. PATH système (Linux/Docker)
DEFAULT_TESSERACT_WINDOWS_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]


def get_or_create_fernet() -> Fernet:
    """
    Prototype: utilise FERNET_KEY si elle existe, sinon crée un fichier local .fernet_key.
    Production: stocker la clé dans un vault ou une variable d'environnement protégée.
    """
    env_key = os.getenv("FERNET_KEY")
    if env_key:
        key = env_key.encode("utf-8")
    elif FERNET_KEY_FILE.exists():
        key = FERNET_KEY_FILE.read_bytes().strip()
    else:
        key = Fernet.generate_key()
        FERNET_KEY_FILE.write_bytes(key)
    return Fernet(key)


def encrypt_bytes(data: bytes) -> bytes:
    return get_or_create_fernet().encrypt(data)


def decrypt_bytes(data: bytes) -> bytes:
    return get_or_create_fernet().decrypt(data)


def configure_tesseract() -> str | None:
    """
    Configure pytesseract avec le bon chemin Tesseract selon l'environnement.

    Ordre de priorité :
    1. Variable d'environnement TESSERACT_CMD (toujours prioritaire)
    2. Chemins Windows standards (Program Files)
    3. PATH système — Linux/Docker : Tesseract installé via apt, aucune config nécessaire.

    Retourne le chemin utilisé, ou None si Tesseract est trouvé dans le PATH.
    """
    try:
        import pytesseract  # type: ignore
    except Exception:
        return None

    candidates = [
        os.getenv("TESSERACT_CMD"),          # 1. Variable d'env — toujours prioritaire
        *DEFAULT_TESSERACT_WINDOWS_PATHS,    # 2. Chemins Windows standards
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            pytesseract.pytesseract.tesseract_cmd = candidate
            tessdata_dir = Path(candidate).parent / "tessdata"
            if tessdata_dir.exists():
                os.environ.setdefault("TESSDATA_PREFIX", str(tessdata_dir))
            return candidate

    # 3. Aucun chemin absolu trouvé → Tesseract doit être dans le PATH (Linux/Docker)
    return None


def get_available_tesseract_languages() -> list[str]:
    """
    Récupère les langues disponibles. Si la commande échoue, on renvoie une liste vide
    pour permettre un fallback sans bloquer l'upload.
    """
    try:
        configure_tesseract()
        import pytesseract  # type: ignore

        return list(pytesseract.get_languages(config=""))
    except Exception:
        return []


def select_ocr_language() -> str:
    """
    Sélectionne fra+eng si possible. Sinon, bascule automatiquement sur eng.
    Tu peux forcer avec TESSERACT_LANG=eng ou TESSERACT_LANG=fra+eng.
    """
    forced_lang = os.getenv("TESSERACT_LANG")
    if forced_lang:
        return forced_lang

    langs = set(get_available_tesseract_languages())
    if "fra" in langs and "eng" in langs:
        return "fra+eng"
    if "fra" in langs:
        return "fra"
    return "eng"


def normalize_for_match(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.upper()
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def fuzzy_contains(needle: str, haystack: str, min_ratio: float = 0.78) -> bool:
    needle = normalize_for_match(needle)
    haystack = normalize_for_match(haystack)

    if not needle or not haystack:
        return False

    if needle in haystack:
        return True

    words = haystack.split()
    n = len(needle.split()) or 1

    for i in range(0, max(1, len(words) - n + 1)):
        chunk = " ".join(words[i:i + n])
        if SequenceMatcher(None, needle, chunk).ratio() >= min_ratio:
            return True

    return SequenceMatcher(None, needle, haystack).ratio() >= min_ratio


def assess_image_quality(content: bytes, mime_type: str | None) -> dict[str, Any]:
    """
    Contrôle la luminosité, les reflets et la netteté par variance du Laplacien.
    Pour les PDF, le contrôle n'est pas appliqué dans le MVP.
    """
    if not (mime_type or "").startswith("image/"):
        return {
            "supported": False,
            "brightness": None,
            "laplacian_variance": None,
            "quality_score": 60,
            "quality_status": "NOT_ANALYZED",
            "findings": ["Contrôle qualité non appliqué à ce type de fichier."],
        }

    findings: list[str] = []

    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore

        arr = np.frombuffer(content, dtype=np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Image illisible par OpenCV")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = float(gray.mean())
        laplacian_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        glare_fraction = float((gray >= 248).mean())

        score = 100

        if brightness < 55:
            score -= 35
            findings.append("Image trop sombre")
        elif brightness > 210:
            score -= 25
            findings.append("Image trop claire")

        if glare_fraction > 0.10:
            score -= 25
            findings.append("Reflet ou surexposition détecté")

        if laplacian_variance < 70:
            score -= 40
            findings.append("Image floue")
        elif laplacian_variance < 120:
            score -= 15
            findings.append("Netteté moyenne")

        score = max(0, min(100, score))
        status = "OK" if score >= 65 else "LOW_QUALITY"

        return {
            "supported": True,
            "brightness": round(brightness, 2),
            "laplacian_variance": round(laplacian_variance, 2),
            "glare_fraction": round(glare_fraction, 4),
            "quality_score": score,
            "quality_status": status,
            "findings": findings or ["Qualité image acceptable"],
        }
    except Exception as exc:
        return {
            "supported": False,
            "brightness": None,
            "laplacian_variance": None,
            "quality_score": 50,
            "quality_status": "NOT_ANALYZED",
            "findings": [f"Contrôle qualité indisponible : {exc}"],
        }


def preprocess_image_for_ocr(content: bytes):
    """
    Prétraitement léger pour améliorer Tesseract:
    - correction orientation EXIF,
    - conversion RGB,
    - passage en niveaux de gris,
    - légère augmentation de taille si image petite.
    """
    from PIL import Image, ImageOps  # type: ignore

    image = Image.open(BytesIO(content))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    max_side = max(image.size)
    if max_side < 1400:
        ratio = 1400 / max_side
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size)

    image = ImageOps.grayscale(image)
    return image


def extract_text_with_tesseract(content: bytes, mime_type: str | None) -> dict[str, Any]:
    """
    OCR pour les images. Le support PDF pourra être ajouté plus tard avec pdf2image + Poppler.
    """
    if not (mime_type or "").startswith("image/"):
        return {
            "supported": False,
            "text": "",
            "ocr_status": "NOT_ANALYZED",
            "message": "OCR non appliqué à ce type de fichier dans le MVP.",
        }

    try:
        configure_tesseract()
        import pytesseract  # type: ignore

        image = preprocess_image_for_ocr(content)
        lang = select_ocr_language()

        text = pytesseract.image_to_string(
            image,
            lang=lang,
            config="--oem 3 --psm 6",
        ).strip()

        return {
            "supported": True,
            "language": lang,
            "text": text,
            "ocr_status": "TEXT_EXTRACTED" if text else "NO_TEXT_FOUND",
            "message": f"OCR exécuté avec succès en {lang}." if text else f"Aucun texte exploitable détecté en {lang}.",
        }
    except Exception as exc:
        return {
            "supported": False,
            "language": None,
            "text": "",
            "ocr_status": "OCR_UNAVAILABLE",
            "message": f"OCR indisponible : {exc}",
        }


def build_birth_date_variants(birth_date: str) -> set[str]:
    """
    Génère plusieurs formats possibles pour matcher une date OCR:
    - 2000-01-31 -> 20000131
    - 31/01/2000 -> 31012000
    - 31 01 2000, 31-01-2000, etc.
    """
    variants: set[str] = set()
    raw = str(birth_date or "").strip()
    if not raw:
        return variants

    digits = re.sub(r"\D", "", raw)
    if digits:
        variants.add(digits)

    # Format ISO YYYY-MM-DD venant souvent de la base.
    iso_match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", raw)
    if iso_match:
        yyyy, mm, dd = iso_match.groups()
        variants.update({
            f"{yyyy}{mm}{dd}",
            f"{dd}{mm}{yyyy}",
            f"{dd}/{mm}/{yyyy}",
            f"{dd}-{mm}-{yyyy}",
            f"{dd}.{mm}.{yyyy}",
            f"{dd} {mm} {yyyy}",
        })

    return {normalize_for_match(v) for v in variants if v}


def match_date_in_ocr(birth_date: str, ocr_text: str) -> bool:
    variants = build_birth_date_variants(birth_date)
    normalized_text = normalize_for_match(ocr_text)
    compact_text = re.sub(r"\s+", "", normalized_text)

    for variant in variants:
        compact_variant = re.sub(r"\s+", "", variant)
        if compact_variant and compact_variant in compact_text:
            return True

    return False


def match_ocr_with_application(ocr_text: str, application: Any) -> dict[str, Any]:
    text = normalize_for_match(ocr_text)

    last_name = normalize_for_match(getattr(application, "last_name", None))
    first_name = normalize_for_match(getattr(application, "first_name", None))
    birth_name = normalize_for_match(getattr(application, "birth_name", None))
    document_number = normalize_for_match(getattr(application, "identity_document_number", None))
    birth_date = str(getattr(application, "birth_date", "") or "")

    checks: list[dict[str, Any]] = []
    score = 0

    last_name_ok = fuzzy_contains(last_name, text) if last_name else False
    first_name_ok = fuzzy_contains(first_name, text) if first_name else False
    birth_name_ok = fuzzy_contains(birth_name, text) if birth_name else False

    if last_name_ok:
        score += 30
    if first_name_ok:
        score += 25
    if birth_name and birth_name_ok:
        score += 15

    checks.append({"field": "last_name", "expected": last_name, "matched": last_name_ok})
    checks.append({"field": "first_name", "expected": first_name, "matched": first_name_ok})
    if birth_name:
        checks.append({"field": "birth_name", "expected": birth_name, "matched": birth_name_ok})

    document_number_ok = False
    if document_number:
        compact_text = re.sub(r"\s+", "", text)
        compact_doc = re.sub(r"\s+", "", document_number)
        document_number_ok = compact_doc in compact_text or fuzzy_contains(document_number, text, 0.72)
        if document_number_ok:
            score += 30
        checks.append({
            "field": "identity_document_number",
            "expected": document_number,
            "matched": document_number_ok,
        })

    birth_date_ok = False
    if birth_date:
        birth_date_ok = match_date_in_ocr(birth_date, ocr_text)
        if birth_date_ok:
            score += 10
        checks.append({"field": "birth_date", "expected": birth_date, "matched": birth_date_ok})

    score = max(0, min(100, score))

    if not ocr_text:
        status = "OCR_REVIEW_REQUIRED"
    elif score >= 65:
        status = "MATCH_OK"
    elif score >= 35:
        status = "PARTIAL_MATCH"
    else:
        status = "MISMATCH"

    return {
        "match_score": score,
        "match_status": status,
        "checks": checks,
    }




def normalize_rib_for_matching(value: str | None) -> str:
    import re
    return re.sub(r"\D+", "", value or "")


def match_rib_with_application(ocr_text: str, application: Any) -> dict[str, Any]:
    import re
    from difflib import SequenceMatcher

    expected = normalize_rib_for_matching(getattr(application, "rib", None))
    numbers = re.findall(r"[0-9][0-9\s\-\.]{5,}[0-9]", ocr_text or "")
    candidates = sorted({normalize_rib_for_matching(x) for x in numbers if normalize_rib_for_matching(x)}, key=len, reverse=True)

    checks = [{
        "field": "rib",
        "expected": expected,
        "detected_candidates": candidates[:8],
        "status": "NOT_CHECKED",
        "score": 0,
    }]

    if not expected:
        checks[0]["status"] = "NO_RIB_PROVIDED"
        return {
            "match_score": 0,
            "match_status": "OCR_REVIEW_REQUIRED",
            "checks": checks,
        }

    best_score = 0
    best_candidate = ""

    for candidate in candidates:
        if expected in candidate or candidate in expected:
            best_score = 100
            best_candidate = candidate
            break

        score = int(SequenceMatcher(None, expected, candidate).ratio() * 100)
        if score > best_score:
            best_score = score
            best_candidate = candidate

    checks[0]["detected"] = best_candidate
    checks[0]["score"] = best_score

    if best_score >= 90:
        checks[0]["status"] = "MATCH"
        status = "MATCH_OK"
    elif best_score >= 65:
        checks[0]["status"] = "PARTIAL_MATCH"
        status = "PARTIAL_MATCH"
    else:
        checks[0]["status"] = "MISMATCH"
        status = "MISMATCH"

    return {
        "match_score": best_score,
        "match_status": status,
        "checks": checks,
    }


def match_income_document(ocr_text: str) -> dict[str, Any]:
    text = (ocr_text or "").strip()
    keywords = [
        "salaire", "salary", "revenu", "income", "bulletin", "paie",
        "pay", "employeur", "contrat", "tax", "impôt", "bank statement",
        "relevé", "attestation"
    ]

    found = [kw for kw in keywords if kw.lower() in text.lower()]
    score = 70 if found else (40 if len(text) > 30 else 0)

    if score >= 60:
        status = "PARTIAL_MATCH"
    else:
        status = "OCR_REVIEW_REQUIRED"

    return {
        "match_score": score,
        "match_status": status,
        "checks": [{
            "field": "income_proof",
            "expected": "Justificatif de revenu",
            "detected_keywords": found,
            "status": "DOCUMENT_READABLE" if found else "REVIEW_REQUIRED",
            "score": score,
        }],
    }


# AFB_RAPIDOCR_ENGINE_V1
_RAPIDOCR_ENGINE = None

# AFB_OCR_LATIN_MODEL_V1 : modèle de reconnaissance « latin » (repris du projet
# fbrs) — nettement plus fiable que le modèle par défaut (orienté chinois) pour
# les pièces camerounaises : accents français, espaces entre les mots, lettres
# proches (O/0, I/1). Utilisé automatiquement si les fichiers sont présents.
OCR_MODELS_DIR = Path(__file__).resolve().parents[1] / "ocr_models"
LATIN_REC_MODEL = OCR_MODELS_DIR / "latin_PP-OCRv3_rec_infer.onnx"
LATIN_REC_KEYS = OCR_MODELS_DIR / "latin_dict.txt"


def get_rapidocr_engine():
    """
    Charge RapidOCR une seule fois.
    Compatible avec rapidocr_onnxruntime et rapidocr selon le package installé.
    """
    global _RAPIDOCR_ENGINE

    if _RAPIDOCR_ENGINE is not None:
        return _RAPIDOCR_ENGINE

    try:
        from rapidocr_onnxruntime import RapidOCR  # type: ignore
    except Exception:
        from rapidocr import RapidOCR  # type: ignore

    if LATIN_REC_MODEL.exists() and LATIN_REC_KEYS.exists():
        try:
            # det_limit_side_len relevé (comme dans fbrs) : à la valeur par
            # défaut (736 px), les petites zones — numéro de pièce, dates —
            # disparaissent de la détection.
            _RAPIDOCR_ENGINE = RapidOCR(
                rec_model_path=str(LATIN_REC_MODEL),
                rec_keys_path=str(LATIN_REC_KEYS),
                det_limit_side_len=1536,
            )
            return _RAPIDOCR_ENGINE
        except Exception:
            pass

    _RAPIDOCR_ENGINE = RapidOCR()
    return _RAPIDOCR_ENGINE


def _word_spaced_text(text: str, char_boxes) -> str:
    """
    AFB_OCR_WORD_SPACING_V1 : le modèle de reconnaissance ne produit pas
    d'espaces (absents du dictionnaire). Avec return_word_box, RapidOCR fournit
    la boîte de chaque caractère : un écart horizontal nettement supérieur à la
    largeur médiane d'un caractère marque un espace (technique équivalente au
    rapidLinesToWords de fbrs).
    """
    try:
        if not char_boxes or len(char_boxes) != len(text) or len(text) < 2:
            return text

        widths = []
        for box in char_boxes:
            xs = [float(p[0]) for p in box]
            widths.append(max(xs) - min(xs))

        positive = sorted(w for w in widths if w > 0)
        if not positive:
            return text
        median_width = positive[len(positive) // 2]
        if median_width <= 0:
            return text

        gaps = []
        for i in range(1, len(text)):
            prev_xs = [float(p[0]) for p in char_boxes[i - 1]]
            cur_xs = [float(p[0]) for p in char_boxes[i]]
            gaps.append(min(cur_xs) - max(prev_xs))

        # Seuil adaptatif : un espace est un écart nettement supérieur au
        # crénage courant de la zone (médiane des écarts positifs). Le ratio
        # fixe sur la largeur des caractères sur-découpait les polices serrées
        # et ratait les espaces des polices larges.
        positive_gaps = sorted(g for g in gaps if g > 0)
        median_gap = positive_gaps[len(positive_gaps) // 2] if positive_gaps else 0.0
        threshold = max(4.0, 0.35 * median_width, 2.0 * median_gap)

        pieces = [text[0]]
        for i in range(1, len(text)):
            if gaps[i - 1] > threshold:
                pieces.append(" ")
            pieces.append(text[i])

        return "".join(pieces)
    except Exception:
        return text


def _parse_rapidocr_result(result):
    # AFB_OCR_LINE_RECONSTRUCTION_V1 (technique reprise de fbrs) : regrouper les
    # boîtes détectées par ligne visuelle (Y proche) puis les ordonner de gauche
    # à droite. Sans cela, les zones d'une même ligne de CNI (libellé à gauche,
    # valeur à droite) sortent dans un ordre arbitraire et sans espaces, ce qui
    # casse l'extraction des champs en aval.
    if not result:
        return "", 0

    items = []
    scores = []

    for item in result:
        try:
            box = None
            text = ""
            score = None

            # Format courant : [box, text, score]
            # Avec return_word_box : [box, text, score, char_boxes, chars, char_scores]
            if len(item) >= 3:
                box = item[0]
                text = str(item[1] or "").strip()
                score = item[2]

                if len(item) >= 4:
                    text = _word_spaced_text(text, item[3]).strip()

            # Autres formats possibles : [box, (text, score)]
            elif len(item) >= 2 and isinstance(item[1], (list, tuple)):
                box = item[0]
                text = str(item[1][0] or "").strip()
                if len(item[1]) > 1:
                    score = item[1][1]

            elif len(item) >= 2:
                box = item[0]
                text = str(item[1] or "").strip()

            if not text:
                continue

            try:
                xs = [float(p[0]) for p in box]
                ys = [float(p[1]) for p in box]
                x_left = min(xs)
                y_center = (min(ys) + max(ys)) / 2.0
                height = max(ys) - min(ys)
            except Exception:
                x_left, y_center, height = 0.0, float(len(items)) * 1000.0, 0.0

            items.append({"text": text, "x": x_left, "y": y_center, "h": height})

            if score is not None:
                try:
                    scores.append(float(score))
                except Exception:
                    pass
        except Exception:
            continue

    if not items:
        return "", 0

    heights = sorted(i["h"] for i in items if i["h"] > 0)
    median_height = heights[len(heights) // 2] if heights else 10.0
    tolerance = max(6.0, median_height * 0.6)

    items.sort(key=lambda i: i["y"])
    rows = []
    for entry in items:
        if rows and abs(entry["y"] - rows[-1]["y"]) <= tolerance:
            rows[-1]["items"].append(entry)
            # moyenne glissante : la ligne suit la dérive verticale des boîtes
            rows[-1]["y"] += (entry["y"] - rows[-1]["y"]) / len(rows[-1]["items"])
        else:
            rows.append({"y": entry["y"], "items": [entry]})

    lines = []
    for row in rows:
        row["items"].sort(key=lambda i: i["x"])
        lines.append(" ".join(i["text"] for i in row["items"]))

    confidence = int((sum(scores) / len(scores)) * 100) if scores else 0
    return _deglue_known_labels("\n".join(lines).strip()), confidence


# AFB_OCR_LABEL_DEGLUE_V1 : la reconnaissance colle ou sur-découpe parfois les
# libellés officiels (« DATEDENAISSANCE », « PLA CE OF BIRTH »), ce qui fait
# rater les extracteurs de champs et la validation du type de document.
# Chaque libellé canonique est matché lettre à lettre avec espaces optionnels
# entre elles, puis remplacé par sa forme normalisée — aucune retouche des
# valeurs (noms, numéros). Libellés longs uniquement : pas de faux positifs.
_CANONICAL_LABELS = [
    "DATE DE NAISSANCE",
    "DATE OF BIRTH",
    "LIEU DE NAISSANCE",
    "PLACE OF BIRTH",
    "GIVEN NAMES",
    "DATE DE DELIVRANCE",
    "DATE OF ISSUE",
    "DATE D EXPIRATION",
    "DATE OF EXPIRY",
    "IDENTIFIANT UNIQUE",
    "UNIQUE IDENTIFIER",
    "CARTE NATIONALE D'IDENTITE",
    "NATIONAL IDENTITY CARD",
    "REPUBLIQUE DU CAMEROUN",
    "REPUBLIC OF CAMEROON",
    "NUMERO DE PASSEPORT",
    "PASSPORT NUMBER",
]


def _label_pattern(label: str) -> re.Pattern:
    chars = [c for c in label if not c.isspace()]
    return re.compile(r"\s*".join(re.escape(c) for c in chars), re.IGNORECASE)


_GLUED_LABEL_PATTERNS: list[tuple[re.Pattern, str]] = [
    (_label_pattern(label), label) for label in _CANONICAL_LABELS
]


def _deglue_known_labels(text: str) -> str:
    if not text:
        return text

    for pattern, spaced in _GLUED_LABEL_PATTERNS:
        text = pattern.sub(spaced, text)

    return text


def _enhance_image_for_rapidocr(image_array):
    """
    AFB_OCR_ENHANCE_V1 — prétraitement repris de fbrs pour les photos difficiles
    (CNI sombre, inclinée, petite) : redressement léger (deskew Otsu), contraste
    local (CLAHE) et agrandissement. Utilisé en second passage uniquement.
    """
    import cv2
    import numpy as np

    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

    # Redressement si l'inclinaison est légère (au-delà, c'est probablement
    # la géométrie de la photo, pas un défaut de cadrage).
    try:
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        coords = cv2.findNonZero(thresh)
        if coords is not None:
            angle = cv2.minAreaRect(coords)[-1]
            if angle > 45:
                angle -= 90
            if 0.3 <= abs(angle) <= 15:
                h, w = gray.shape[:2]
                matrix = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
                gray = cv2.warpAffine(
                    gray, matrix, (w, h),
                    flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE,
                )
    except Exception:
        pass

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Les petits caractères (numéro de pièce, dates) passent sous la taille
    # minimale de détection sur une photo trop petite.
    biggest_side = max(gray.shape[:2])
    if biggest_side < 1400:
        scale = 1400.0 / biggest_side
        gray = cv2.resize(
            gray,
            (round(gray.shape[1] * scale), round(gray.shape[0] * scale)),
            interpolation=cv2.INTER_CUBIC,
        )

    return cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)


def _run_rapidocr(image_array) -> tuple[str, int]:
    engine = get_rapidocr_engine()

    # return_word_box fournit la boîte de chaque caractère : nécessaire pour
    # restaurer les espaces (voir _word_spaced_text). Repli silencieux pour
    # les versions de rapidocr qui ne le supportent pas.
    try:
        result = engine(image_array, return_word_box=True)
    except TypeError:
        result = engine(image_array)

    # rapidocr_onnxruntime retourne souvent (result, elapsed)
    raw_result = result[0] if isinstance(result, tuple) else result

    return _parse_rapidocr_result(raw_result)


def extract_text_with_rapidocr(content: bytes, mime_type: str | None) -> dict[str, Any]:
    """
    OCR rapide par RapidOCR.
    Utilisé comme moteur principal pour les images.
    """
    if not mime_type or not str(mime_type).startswith("image/"):
        return {
            "engine": "RapidOCR",
            "ocr_status": "NOT_ANALYZED",
            "message": "RapidOCR non appliqué à ce type de fichier.",
            "text": "",
            "confidence": 0,
        }

    try:
        from io import BytesIO
        import numpy as np
        from PIL import Image, ImageOps

        image = Image.open(BytesIO(content))
        image = ImageOps.exif_transpose(image)  # respecte l'orientation photo
        image_array = np.array(image.convert("RGB"))

        text, confidence = _run_rapidocr(image_array)

        # AFB_OCR_ENHANCE_V1 : résultat pauvre -> second passage sur image
        # prétraitée (deskew + CLAHE + agrandissement), on garde le meilleur.
        enhanced_used = False
        if len(text) < 40 or confidence < 60:
            try:
                enhanced_text, enhanced_confidence = _run_rapidocr(
                    _enhance_image_for_rapidocr(image_array)
                )
                if len(enhanced_text) > len(text):
                    text, confidence = enhanced_text, enhanced_confidence
                    enhanced_used = True
            except Exception:
                pass

        return {
            "engine": "RapidOCR",
            "ocr_status": "TEXT_EXTRACTED" if text else "NO_TEXT_FOUND",
            "message": "OCR RapidOCR exécuté avec succès." if text else "Aucun texte exploitable détecté par RapidOCR.",
            "text": text,
            "confidence": confidence,
            "enhanced_pass": enhanced_used,
        }

    except Exception as exc:
        return {
            "engine": "RapidOCR",
            "ocr_status": "OCR_UNAVAILABLE",
            "message": f"RapidOCR indisponible : {exc}",
            "text": "",
            "confidence": 0,
        }


def extract_text_with_best_engine(content: bytes, mime_type: str | None) -> dict[str, Any]:
    """
    Moteur OCR hybride :
    1. RapidOCR en priorité.
    2. Tesseract en fallback.
    """
    rapid = extract_text_with_rapidocr(content, mime_type)

    rapid_text = str(rapid.get("text") or "").strip()
    if rapid.get("ocr_status") == "TEXT_EXTRACTED" and len(rapid_text) >= 10:
        rapid["fallback_used"] = False
        return rapid

    tesseract = extract_text_with_tesseract(content, mime_type)
    tess_text = str(tesseract.get("text") or "").strip()

    if tesseract.get("ocr_status") == "TEXT_EXTRACTED" and tess_text:
        tesseract["engine"] = "Tesseract"
        tesseract["fallback_used"] = True
        tesseract["primary_engine_status"] = rapid.get("ocr_status")
        tesseract["primary_engine_message"] = rapid.get("message")
        return tesseract

    rapid["fallback_used"] = False
    rapid["fallback_engine_status"] = tesseract.get("ocr_status")
    rapid["fallback_engine_message"] = tesseract.get("message")
    return rapid



# AFB_OCR_DOCUMENT_TYPE_VALIDATION_V1
def _keyword_hits_for_document_type(text: str, keywords: list[str]) -> list[str]:
    normalized_text = normalize_for_match(text or "")
    hits = []

    for keyword in keywords:
        normalized_keyword = normalize_for_match(keyword)
        if normalized_keyword and normalized_keyword in normalized_text:
            hits.append(keyword)

    return hits


def expected_document_category(document_type: str | None) -> str:
    dtype = (document_type or "").upper()

    if "RIB" in dtype or "BANK" in dtype:
        return "RIB"

    if "INCOME" in dtype or "SALARY" in dtype or "EMPLOYMENT" in dtype or "SCHOOL_CERTIFICATE" in dtype:
        return "INCOME"

    if (
        "CNI" in dtype
        or "PASSPORT" in dtype
        or "IDENTITY" in dtype
        or "BIRTH_CERTIFICATE" in dtype
        or "FILIATION" in dtype
    ):
        return "IDENTITY"

    if "ADDRESS" in dtype or "RESIDENCE" in dtype or "DOMICILE" in dtype:
        return "ADDRESS"

    if "TAX" in dtype or "COMPLIANCE" in dtype or "FISCAL" in dtype:
        return "TAX"

    return "GENERIC_DOCUMENT"


def detect_document_category_from_ocr(ocr_text: str) -> dict[str, Any]:
    text = ocr_text or ""

    suspicious_app_keywords = [
        "ticket2cash",
        "cashback",
        "webhook",
        "claims",
        "espace partenaire",
        "demo_user",
        "tableau de bord",
        "campagnes",
        "commercants",
        "commerçants",
        "finance historique",
        "modele ticket",
        "modèle ticket",
    ]

    rib_keywords = [
        "rib",
        "releve d identite bancaire",
        "relevé d identité bancaire",
        "iban",
        "bic",
        "swift",
        "banque",
        "bank",
        "code banque",
        "code guichet",
        "numero de compte",
        "numéro de compte",
        "compte bancaire",
        "cle rib",
        "clé rib",
        "domiciliation",
        "titulaire du compte",
    ]

    income_keywords = [
        "salaire",
        "salary",
        "revenu",
        "income",
        "bulletin",
        "paie",
        "payslip",
        "employeur",
        "employer",
        "contrat de travail",
        "attestation de travail",
        "certificat de travail",
        "fiche de paie",
    ]

    identity_keywords = [
        "carte nationale",
        "carte d identite",
        "carte d identité",
        "cni",
        "passport",
        "passeport",
        "republique",
        "république",
        "nationalite",
        "nationalité",
        "date de naissance",
        "lieu de naissance",
        "surname",
        "given names",
        "nom",
        "prenom",
        "prénom",
        "sexe",
        "sex",
        "mrz",
        # AFB_CNI_CORPUS_TUNING_V1 : vocabulaire du verso CNI (souvent seul
        # présent sur les scans de verso, appris sur le corpus réel).
        "date de delivrance",
        "date of issue",
        "date d expiration",
        "date of expiry",
        "expiration",
        "delivrance",
        "identifiant unique",
        "poste d identification",
        "identification post",
        "taille",
        "idcmr",
        # AFB_CNI_CONGO_NIU_V1 : carte NIU de la République du Congo.
        "republique du congo",
        "unite travail progres",
        "numero d identification unique",
        "raison sociale",
        "forme juridique",
        "nom commercial",
        "signature du titulaire",
    ]

    address_keywords = [
        "adresse",
        "address",
        "domicile",
        "residence",
        "résidence",
        "facture",
        "electricite",
        "électricité",
        "eau",
        "telephone",
        "téléphone",
        "loyer",
        "bail",
        "utility bill",
    ]

    tax_keywords = [
        "tax",
        "fiscal",
        "impot",
        "impôt",
        "conformite fiscale",
        "conformité fiscale",
        "quitus",
        "attestation fiscale",
        "tax compliance",
    ]

    suspicious_hits = _keyword_hits_for_document_type(text, suspicious_app_keywords)
    rib_hits = _keyword_hits_for_document_type(text, rib_keywords)
    income_hits = _keyword_hits_for_document_type(text, income_keywords)
    identity_hits = _keyword_hits_for_document_type(text, identity_keywords)
    address_hits = _keyword_hits_for_document_type(text, address_keywords)
    tax_hits = _keyword_hits_for_document_type(text, tax_keywords)

    numeric_candidates = re.findall(r"[0-9][0-9\s\-\.]{8,}[0-9]", text or "")
    normalized_numbers = [
        normalize_rib_for_matching(candidate)
        for candidate in numeric_candidates
        if normalize_rib_for_matching(candidate)
    ]
    long_numeric_score = max([len(x) for x in normalized_numbers], default=0)

    if suspicious_hits:
        return {
            "detected_category": "TICKET2CASH_APP",
            "confidence": 95,
            "signals": suspicious_hits[:12],
            "long_numeric_score": long_numeric_score,
        }

    # AFB_CNI_STRUCTURAL_SIGNALS_V1 : signaux structurels des CNI camerounaises,
    # calibrés sur le corpus des CNI réellement envoyées. Le verso 2024 perd
    # souvent tous ses libellés à l'OCR, mais conserve :
    # - l'identifiant unique : 17 chiffres commençant par 20 ;
    # - la signature imprimée du DGSN (« Martin MBARGA NGUELE ») ;
    # - la répétition de libellés bilingues « DATE DE » / « DATE OF »,
    #   même fusionnés (« DATEDEDELIYRAN DATEOFSSA »).
    normalized_full = normalize_for_match(text)
    compact_text = normalized_full.replace(" ", "")

    identity_structural = 0
    structural_signals = []

    if re.search(r"(?<![0-9])20[0-9]{15}(?![0-9])", compact_text):
        identity_structural += 40
        structural_signals.append("identifiant_unique_17_chiffres")

    # AFB_CNI_CONGO_NIU_V1 : NIU congolais — P suivi de 16 chiffres (P2014...).
    if re.search(r"(?<![A-Z0-9])P20[0-9]{14}(?![0-9])", compact_text):
        identity_structural += 40
        structural_signals.append("niu_congo_p16")

    if "MBARGA NGUELE" in normalized_full:
        identity_structural += 25
        structural_signals.append("signature_dgsn")

    if len(re.findall(r"DATEDE|DATEOF", compact_text)) >= 2:
        identity_structural += 20
        structural_signals.append("libelles_dates_bilingues")

    category_scores = {
        "RIB": len(rib_hits) * 25 + (35 if long_numeric_score >= 18 else 0),
        "INCOME": len(income_hits) * 25,
        "IDENTITY": len(identity_hits) * 15 + identity_structural,
        "ADDRESS": len(address_hits) * 25,
        "TAX": len(tax_hits) * 25,
    }

    detected_category = max(category_scores, key=category_scores.get)
    score = category_scores.get(detected_category, 0)

    signals_by_category = {
        "RIB": rib_hits,
        "INCOME": income_hits,
        "IDENTITY": identity_hits + structural_signals,
        "ADDRESS": address_hits,
        "TAX": tax_hits,
    }

    if score <= 0:
        return {
            "detected_category": "UNKNOWN",
            "confidence": 0,
            "signals": [],
            "long_numeric_score": long_numeric_score,
        }

    return {
        "detected_category": detected_category,
        "confidence": min(100, score),
        "signals": signals_by_category.get(detected_category, [])[:12],
        "long_numeric_score": long_numeric_score,
    }


def validate_document_type_against_ocr(document_type: str | None, ocr_text: str | None) -> dict[str, Any]:
    expected = expected_document_category(document_type)
    text = (ocr_text or "").strip()

    if not text:
        return {
            "status": "OCR_TEXT_INSUFFICIENT",
            "expected_category": expected,
            "detected_category": "UNKNOWN",
            "confidence": 0,
            "signals": [],
            "message": "Aucun texte OCR suffisant pour confirmer le type du document.",
        }

    detected = detect_document_category_from_ocr(text)
    detected_category = detected.get("detected_category", "UNKNOWN")
    confidence = int(detected.get("confidence") or 0)

    if detected_category == "TICKET2CASH_APP":
        return {
            "status": "DOCUMENT_TYPE_MISMATCH",
            "expected_category": expected,
            "detected_category": detected_category,
            "confidence": confidence,
            "signals": detected.get("signals", []),
            "message": "Le fichier semble être une capture applicative Ticket2Cash, pas une pièce KYC attendue.",
        }

    if expected == "GENERIC_DOCUMENT":
        return {
            "status": "TYPE_NOT_STRICTLY_CHECKED",
            "expected_category": expected,
            "detected_category": detected_category,
            "confidence": confidence,
            "signals": detected.get("signals", []),
            "message": "Type documentaire générique : contrôle strict non appliqué.",
        }

    if detected_category == "UNKNOWN":
        return {
            "status": "TYPE_UNCERTAIN",
            "expected_category": expected,
            "detected_category": detected_category,
            "confidence": confidence,
            "signals": detected.get("signals", []),
            "message": "Le type réel du document n’a pas pu être confirmé par OCR.",
        }

    if detected_category == expected:
        return {
            "status": "DOCUMENT_TYPE_MATCH",
            "expected_category": expected,
            "detected_category": detected_category,
            "confidence": confidence,
            "signals": detected.get("signals", []),
            "message": "Le contenu OCR est cohérent avec le type de document attendu.",
        }

    return {
        "status": "DOCUMENT_TYPE_MISMATCH",
        "expected_category": expected,
        "detected_category": detected_category,
        "confidence": confidence,
        "signals": detected.get("signals", []),
        "message": "Le contenu OCR ne correspond pas au type de document attendu.",
    }


def analyze_document_content(content: bytes, mime_type: str | None, document_type: str, application: Any) -> dict[str, Any]:
    quality = assess_image_quality(content, mime_type)

    should_ocr = document_type in {
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

        "TAX_COMPLIANCE_CERTIFICATE_PHOTO",
    }

    if should_ocr:
        ocr = extract_text_with_best_engine(content, mime_type)
        ocr_text = ocr.get("text", "")

        if document_type == "RIB_DOCUMENT":
            matching = match_rib_with_application(ocr_text, application)
        elif document_type == "INCOME_PROOF":
            matching = match_income_document(ocr_text)
        else:
            matching = match_ocr_with_application(ocr_text, application)
    else:
        ocr = {
            "supported": False,
            "text": "",
            "ocr_status": "NOT_REQUIRED",
            "message": "OCR non requis pour ce type de document.",
        }
        matching = {
            "match_score": 0,
            "match_status": "NOT_REQUIRED",
            "checks": [],
        }

    document_type_validation = validate_document_type_against_ocr(
        document_type=document_type,
        ocr_text=ocr.get("text", "") if should_ocr else "",
    )

    quality_score = int(quality.get("quality_score") or 0)
    match_score = int(matching.get("match_score") or 0)

    if quality_score < 45:
        verification_status = "QUALITY_REJECTED"
    elif document_type_validation.get("status") == "DOCUMENT_TYPE_MISMATCH":
        verification_status = "REVIEW_REQUIRED"
    elif should_ocr and matching["match_status"] in {"MISMATCH", "OCR_REVIEW_REQUIRED"}:
        verification_status = "REVIEW_REQUIRED"
    elif should_ocr and matching["match_status"] in {"MATCH_OK", "PARTIAL_MATCH"}:
        verification_status = "AUTHENTICATED" if match_score >= 65 and quality_score >= 65 else "REVIEW_REQUIRED"
    else:
        verification_status = "UPLOADED"

    return {
        "document_type": document_type,
        "quality": quality,
        "ocr": ocr,
        "matching": matching,
        "document_type_validation": document_type_validation,
        "verification_status": verification_status,
        "quality_score": quality_score,
    }


def save_encrypted_json(path: str, payload: dict[str, Any]) -> str:
    meta_path = path + ".analysis.enc"
    raw = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    Path(meta_path).write_bytes(encrypt_bytes(raw))
    return meta_path


def load_encrypted_json(meta_path: str) -> dict[str, Any]:
    raw = Path(meta_path).read_bytes()
    decrypted = decrypt_bytes(raw)
    return json.loads(decrypted.decode("utf-8"))


# AFB_MRZ_ICAO9303_CHECKSUM_PARSER_V1
#
# Parseur MRZ (zone de lecture optique) conforme ICAO 9303, avec validation par
# clé de contrôle (check digit). Complète l'extraction heuristique par labels
# (v2_extract_identity_fields dans pre_onboarding.py) : quand une clé de contrôle
# valide un champ, ce champ est nettement plus fiable qu'une lecture par mots-clés
# sur un OCR bruité, donc on le fait remonter avec un indicateur de confiance.
def _mrz_char_value(ch: str) -> int:
    if ch == "<":
        return 0
    if ch.isdigit():
        return int(ch)
    if "A" <= ch <= "Z":
        return ord(ch) - ord("A") + 10
    return -1


def _mrz_check_digit(data: str) -> int | None:
    weights = (7, 3, 1)
    total = 0
    for i, ch in enumerate(data):
        value = _mrz_char_value(ch)
        if value < 0:
            return None
        total += value * weights[i % 3]
    return total % 10


def _mrz_verify(data: str, check_char: str) -> bool:
    check_char = "0" if check_char == "<" else check_char
    if not check_char.isdigit():
        return False
    computed = _mrz_check_digit(data)
    return computed is not None and computed == int(check_char)


def _parse_mrz_yymmdd(raw: str) -> str | None:
    if not re.fullmatch(r"\d{6}", raw or ""):
        return None

    yy, mm, dd = int(raw[0:2]), int(raw[2:4]), int(raw[4:6])
    if not (1 <= mm <= 12 and 1 <= dd <= 31):
        return None

    from datetime import date as _date

    # Pivot standard MRZ : une année à 2 chiffres au-delà de (année courante + 10)
    # est interprétée comme XIXe/XXe siècle, sinon comme XXIe siècle.
    current_year = _date.today().year
    pivot = (current_year + 10) % 100
    century = 2000 if yy <= pivot else 1900

    try:
        return _date(century + yy, mm, dd).isoformat()
    except ValueError:
        return None


def _mrz_name_from_field(field: str) -> tuple[str, str]:
    field = field.rstrip("<")
    parts = field.split("<<", 1)
    surname_raw = parts[0]
    given_raw = parts[1] if len(parts) > 1 else ""
    surname = " ".join(w for w in surname_raw.split("<") if w)
    given = " ".join(w for w in given_raw.split("<") if w)
    return surname, given


def find_mrz_candidate_lines(text: str) -> list[str]:
    """
    Repère les lignes qui ressemblent à de la MRZ dans le texte OCR brut :
    beaucoup de '<', longueur proche d'un format standard (30/36/44).
    """
    candidates = []

    for raw_line in (text or "").splitlines():
        cleaned = unicodedata.normalize("NFD", raw_line.upper())
        cleaned = "".join(ch for ch in cleaned if unicodedata.category(ch) != "Mn")
        cleaned = cleaned.replace(" ", "")
        cleaned = cleaned.replace("«", "<").replace("‹", "<").replace("＜", "<")
        cleaned = re.sub(r"[^A-Z0-9<]", "", cleaned)

        if len(cleaned) >= 28 and cleaned.count("<") >= 2:
            candidates.append(cleaned)

    return candidates


def _pad_or_trim(line: str, target_len: int, tolerance: int = 4) -> str | None:
    if abs(len(line) - target_len) > tolerance:
        return None
    if len(line) < target_len:
        return line + ("<" * (target_len - len(line)))
    return line[:target_len]


def decode_mrz_td3(line1: str, line2: str) -> dict[str, Any] | None:
    line1 = _pad_or_trim(line1, 44)
    line2 = _pad_or_trim(line2, 44)
    if not line1 or not line2:
        return None

    doc_number_field = line2[0:9]
    doc_number_valid = _mrz_verify(doc_number_field, line2[9])

    birth_raw = line2[13:19]
    birth_valid = _mrz_verify(birth_raw, line2[19])

    expiry_raw = line2[21:27]
    expiry_valid = _mrz_verify(expiry_raw, line2[27])

    surname, given = _mrz_name_from_field(line1[5:44])
    sex_char = line2[20]

    return {
        "mrz_format": "TD3",
        "document_number": doc_number_field.replace("<", "") or None,
        "document_number_valid": doc_number_valid,
        "nationality": line2[10:13].replace("<", "") or None,
        "birth_date": _parse_mrz_yymmdd(birth_raw) if birth_valid else None,
        "birth_date_valid": birth_valid,
        "sex": sex_char if sex_char in ("M", "F") else None,
        "expiry_date": _parse_mrz_yymmdd(expiry_raw) if expiry_valid else None,
        "expiry_date_valid": expiry_valid,
        "last_name": surname or None,
        "first_name": given or None,
    }


def decode_mrz_td2(line1: str, line2: str) -> dict[str, Any] | None:
    line1 = _pad_or_trim(line1, 36)
    line2 = _pad_or_trim(line2, 36)
    if not line1 or not line2:
        return None

    doc_number_field = line2[0:9]
    doc_number_valid = _mrz_verify(doc_number_field, line2[9])

    birth_raw = line2[13:19]
    birth_valid = _mrz_verify(birth_raw, line2[19])

    expiry_raw = line2[21:27]
    expiry_valid = _mrz_verify(expiry_raw, line2[27])

    surname, given = _mrz_name_from_field(line1[5:36])
    sex_char = line2[20]

    return {
        "mrz_format": "TD2",
        "document_number": doc_number_field.replace("<", "") or None,
        "document_number_valid": doc_number_valid,
        "nationality": line2[10:13].replace("<", "") or None,
        "birth_date": _parse_mrz_yymmdd(birth_raw) if birth_valid else None,
        "birth_date_valid": birth_valid,
        "sex": sex_char if sex_char in ("M", "F") else None,
        "expiry_date": _parse_mrz_yymmdd(expiry_raw) if expiry_valid else None,
        "expiry_date_valid": expiry_valid,
        "last_name": surname or None,
        "first_name": given or None,
    }


def decode_mrz_td1(line1: str, line2: str, line3: str) -> dict[str, Any] | None:
    line1 = _pad_or_trim(line1, 30)
    line2 = _pad_or_trim(line2, 30)
    line3 = _pad_or_trim(line3, 30)
    if not line1 or not line2 or not line3:
        return None

    doc_number_field = line1[5:14]
    doc_number_valid = _mrz_verify(doc_number_field, line1[14])

    birth_raw = line2[0:6]
    birth_valid = _mrz_verify(birth_raw, line2[6])

    expiry_raw = line2[8:14]
    expiry_valid = _mrz_verify(expiry_raw, line2[14])

    surname, given = _mrz_name_from_field(line3)
    sex_char = line2[7]

    return {
        "mrz_format": "TD1",
        "document_number": doc_number_field.replace("<", "") or None,
        "document_number_valid": doc_number_valid,
        "nationality": line2[15:18].replace("<", "") or None,
        "birth_date": _parse_mrz_yymmdd(birth_raw) if birth_valid else None,
        "birth_date_valid": birth_valid,
        "sex": sex_char if sex_char in ("M", "F") else None,
        "expiry_date": _parse_mrz_yymmdd(expiry_raw) if expiry_valid else None,
        "expiry_date_valid": expiry_valid,
        "last_name": surname or None,
        "first_name": given or None,
    }


def parse_mrz_icao9303(ocr_text: str) -> dict[str, Any]:
    """
    Tente de décoder la MRZ (TD1 carte d'identité 3 lignes, TD2/TD3 passeport
    2 lignes) avec validation par clé de contrôle ICAO 9303. Renvoie un résultat
    vide (mrz_detected: False) si aucune ligne exploitable n'est trouvée : les
    appelants doivent alors se rabattre sur l'extraction heuristique par labels.
    """
    lines = find_mrz_candidate_lines(ocr_text)

    if not lines:
        return {"mrz_detected": False}

    attempts = []

    # TD3 (passeport, 2 lignes de 44) : on essaie toutes les paires consécutives.
    for i in range(len(lines) - 1):
        decoded = decode_mrz_td3(lines[i], lines[i + 1])
        if decoded:
            attempts.append(decoded)

    # TD2 (2 lignes de 36).
    for i in range(len(lines) - 1):
        decoded = decode_mrz_td2(lines[i], lines[i + 1])
        if decoded:
            attempts.append(decoded)

    # TD1 (carte d'identité, 3 lignes de 30).
    for i in range(len(lines) - 2):
        decoded = decode_mrz_td1(lines[i], lines[i + 1], lines[i + 2])
        if decoded:
            attempts.append(decoded)

    if not attempts:
        return {"mrz_detected": False, "mrz_lines_raw": lines}

    def score(attempt: dict[str, Any]) -> int:
        return sum(1 for k in ("document_number_valid", "birth_date_valid", "expiry_date_valid") if attempt.get(k))

    best = max(attempts, key=score)

    validated_fields = [
        name for name, valid_key in (
            ("document_number", "document_number_valid"),
            ("birth_date", "birth_date_valid"),
            ("expiry_date", "expiry_date_valid"),
        )
        if best.get(valid_key)
    ]

    return {
        "mrz_detected": True,
        "mrz_format": best.get("mrz_format"),
        "mrz_checksum_validated_fields": validated_fields,
        "fields": {
            "last_name": best.get("last_name"),
            "first_name": best.get("first_name"),
            "birth_date": best.get("birth_date") if best.get("birth_date_valid") else None,
            "sex": best.get("sex"),
            "nationality": best.get("nationality"),
            "document_number": best.get("document_number") if best.get("document_number_valid") else None,
            "expiry_date": best.get("expiry_date") if best.get("expiry_date_valid") else None,
        },
        "mrz_lines_raw": lines,
    }


# Configure Tesseract au chargement du module si possible.
configure_tesseract()
