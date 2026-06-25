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

# Chemin trouvé sur ton poste Windows.
# La variable d'environnement TESSERACT_CMD reste prioritaire si tu changes de machine.
DEFAULT_TESSERACT_EXE = r"C:\Users\etienne_bello\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"


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
    Configure pytesseract avec le chemin Windows détecté.
    Retourne le chemin utilisé, ou None si Tesseract est uniquement disponible via PATH.
    """
    try:
        import pytesseract  # type: ignore
    except Exception:
        return None

    candidates = [
        os.getenv("TESSERACT_CMD"),
        DEFAULT_TESSERACT_EXE,
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            pytesseract.pytesseract.tesseract_cmd = candidate
            tessdata_dir = Path(candidate).parent / "tessdata"
            if tessdata_dir.exists():
                os.environ.setdefault("TESSDATA_PREFIX", str(tessdata_dir))
            return candidate

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


def analyze_document_content(content: bytes, mime_type: str | None, document_type: str, application: Any) -> dict[str, Any]:
    quality = assess_image_quality(content, mime_type)

    should_ocr = document_type in {
        "IDENTITY_DOCUMENT",
        "IDENTITY_DOCUMENT_PHOTO",
        "IDENTITY_DOCUMENT_RECTO",
        "IDENTITY_DOCUMENT_VERSO",
        "IDENTITY_DOCUMENT_IMPORTED",
        "BIRTH_CERTIFICATE_PHOTO",
        "IDENTITY_WITH_FILIATION",
    }

    if should_ocr:
        ocr = extract_text_with_tesseract(content, mime_type)
        matching = match_ocr_with_application(ocr.get("text", ""), application)
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

    quality_score = int(quality.get("quality_score") or 0)
    match_score = int(matching.get("match_score") or 0)

    if quality_score < 45:
        verification_status = "QUALITY_REJECTED"
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


# Configure Tesseract au chargement du module si possible.
configure_tesseract()
