"""engine.py — moteur OCR (RapidOCR/ONNX modèle latin + fallback Tesseract).

Port fidèle de app/services/document_auth_service.py (fonctions OCR uniquement).
Le moteur RapidOCR est chargé UNE SEULE FOIS, paresseusement (au premier appel),
puis mis en cache pour rester sans état et garder /health instantané.

API publique : run_ocr(image_bytes) -> {"raw_text", "engine", "lines", "confidence"}.
"""
import os
import re
from io import BytesIO
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Résolution du dossier des modèles latins.
#
# Configurable via OCR_MODELS_DIR. Sinon, on essaie plusieurs emplacements
# candidats et on retient le premier qui contient bien le modèle latin.
# Dans ce dépôt, les fichiers vivent dans app/ocr_models/ (cf. le monolithe
# OCR_MODELS_DIR = parents[1]/"ocr_models" depuis app/services/...).
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve()
_SERVICE_DIR = _HERE.parents[1]          # .../ocr-service
_REPO_ROOT = _HERE.parents[2]            # racine du dépôt

_MODEL_FILENAME = "latin_PP-OCRv3_rec_infer.onnx"
_KEYS_FILENAME = "latin_dict.txt"


def _candidate_model_dirs() -> list[Path]:
    candidates: list[Path] = []
    env_dir = os.getenv("OCR_MODELS_DIR")
    if env_dir:
        candidates.append(Path(env_dir))
    candidates.append(_SERVICE_DIR / "ocr_models")   # ../ocr_models (défaut documenté)
    candidates.append(_REPO_ROOT / "ocr_models")     # racine/ocr_models
    candidates.append(_REPO_ROOT / "app" / "ocr_models")  # emplacement réel des fichiers
    return candidates


def _resolve_model_paths() -> tuple[Path | None, Path | None]:
    for directory in _candidate_model_dirs():
        try:
            model = directory / _MODEL_FILENAME
            keys = directory / _KEYS_FILENAME
            if model.exists() and keys.exists():
                return model, keys
        except Exception:
            continue
    return None, None


# ---------------------------------------------------------------------------
# Tesseract (fallback) — port de configure_tesseract / select_ocr_language.
# ---------------------------------------------------------------------------
DEFAULT_TESSERACT_WINDOWS_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]


def configure_tesseract() -> str | None:
    """Configure pytesseract selon TESSERACT_CMD puis les chemins Windows standards.

    Retourne le chemin utilisé, ou None si Tesseract est cherché dans le PATH.
    """
    try:
        import pytesseract  # type: ignore
    except Exception:
        return None

    candidates = [
        os.getenv("TESSERACT_CMD"),
        *DEFAULT_TESSERACT_WINDOWS_PATHS,
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
    try:
        configure_tesseract()
        import pytesseract  # type: ignore

        return list(pytesseract.get_languages(config=""))
    except Exception:
        return []


def select_ocr_language() -> str:
    """fra+eng si dispo, sinon repli. Forçable via TESSERACT_LANG."""
    forced_lang = os.getenv("TESSERACT_LANG")
    if forced_lang:
        return forced_lang

    langs = set(get_available_tesseract_languages())
    if "fra" in langs and "eng" in langs:
        return "fra+eng"
    if "fra" in langs:
        return "fra"
    return "eng"


def preprocess_image_for_ocr(content: bytes):
    """Prétraitement léger pour Tesseract (EXIF, RGB, gris, agrandissement)."""
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


def extract_text_with_tesseract(content: bytes) -> dict[str, Any]:
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
            "engine": "Tesseract",
            "language": lang,
            "text": text,
            "ocr_status": "TEXT_EXTRACTED" if text else "NO_TEXT_FOUND",
            "confidence": 0,
        }
    except Exception as exc:
        return {
            "engine": "Tesseract",
            "language": None,
            "text": "",
            "ocr_status": "OCR_UNAVAILABLE",
            "confidence": 0,
            "message": f"OCR indisponible : {exc}",
        }


# ---------------------------------------------------------------------------
# RapidOCR — chargement paresseux + reconstruction de lignes/espaces.
# Port de get_rapidocr_engine / _word_spaced_text / _parse_rapidocr_result /
# _deglue_known_labels / _enhance_image_for_rapidocr / _run_rapidocr.
# ---------------------------------------------------------------------------
_RAPIDOCR_ENGINE = None


def get_rapidocr_engine():
    """Charge RapidOCR une seule fois (modèle latin si présent, sinon défaut)."""
    global _RAPIDOCR_ENGINE

    if _RAPIDOCR_ENGINE is not None:
        return _RAPIDOCR_ENGINE

    try:
        from rapidocr_onnxruntime import RapidOCR  # type: ignore
    except Exception:
        from rapidocr import RapidOCR  # type: ignore

    latin_rec_model, latin_rec_keys = _resolve_model_paths()

    if latin_rec_model and latin_rec_keys:
        try:
            _RAPIDOCR_ENGINE = RapidOCR(
                rec_model_path=str(latin_rec_model),
                rec_keys_path=str(latin_rec_keys),
                det_limit_side_len=1536,
            )
            return _RAPIDOCR_ENGINE
        except Exception:
            pass

    _RAPIDOCR_ENGINE = RapidOCR()
    return _RAPIDOCR_ENGINE


def _word_spaced_text(text: str, char_boxes) -> str:
    """Restaure les espaces à partir des boîtes caractères (return_word_box)."""
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


# Libellés officiels canoniques pour le « deglue » (voir _deglue_known_labels).
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


def _label_pattern(label: str) -> "re.Pattern":
    chars = [c for c in label if not c.isspace()]
    return re.compile(r"\s*".join(re.escape(c) for c in chars), re.IGNORECASE)


_GLUED_LABEL_PATTERNS: list[tuple["re.Pattern", str]] = [
    (_label_pattern(label), label) for label in _CANONICAL_LABELS
]


def _deglue_known_labels(text: str) -> str:
    if not text:
        return text
    for pattern, spaced in _GLUED_LABEL_PATTERNS:
        text = pattern.sub(spaced, text)
    return text


def _parse_rapidocr_result(result):
    """Regroupe les boîtes par ligne visuelle (Y proche) puis ordonne en X."""
    if not result:
        return "", 0

    items = []
    scores = []

    for item in result:
        try:
            box = None
            text = ""
            score = None

            if len(item) >= 3:
                box = item[0]
                text = str(item[1] or "").strip()
                score = item[2]

                if len(item) >= 4:
                    text = _word_spaced_text(text, item[3]).strip()

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
            rows[-1]["y"] += (entry["y"] - rows[-1]["y"]) / len(rows[-1]["items"])
        else:
            rows.append({"y": entry["y"], "items": [entry]})

    lines = []
    for row in rows:
        row["items"].sort(key=lambda i: i["x"])
        lines.append(" ".join(i["text"] for i in row["items"]))

    confidence = int((sum(scores) / len(scores)) * 100) if scores else 0
    return _deglue_known_labels("\n".join(lines).strip()), confidence


def _enhance_image_for_rapidocr(image_array):
    """Second passage : deskew Otsu léger + CLAHE + agrandissement."""
    import cv2
    import numpy as np  # noqa: F401

    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

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

    try:
        result = engine(image_array, return_word_box=True)
    except TypeError:
        result = engine(image_array)

    raw_result = result[0] if isinstance(result, tuple) else result

    return _parse_rapidocr_result(raw_result)


def extract_text_with_rapidocr(content: bytes) -> dict[str, Any]:
    try:
        import numpy as np
        from PIL import Image, ImageOps

        image = Image.open(BytesIO(content))
        image = ImageOps.exif_transpose(image)
        image_array = np.array(image.convert("RGB"))

        text, confidence = _run_rapidocr(image_array)

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
            "text": text,
            "confidence": confidence,
            "enhanced_pass": enhanced_used,
        }
    except Exception as exc:
        return {
            "engine": "RapidOCR",
            "ocr_status": "OCR_UNAVAILABLE",
            "text": "",
            "confidence": 0,
            "message": f"RapidOCR indisponible : {exc}",
        }


def run_ocr(image_bytes: bytes) -> dict[str, Any]:
    """Moteur hybride : RapidOCR en priorité, Tesseract en fallback.

    Retourne {"raw_text", "engine", "lines", "confidence"} — clés stables pour
    l'appelant. `lines` est la liste des lignes reconstruites (ordre visuel).
    """
    rapid = extract_text_with_rapidocr(image_bytes)
    rapid_text = str(rapid.get("text") or "").strip()

    if rapid.get("ocr_status") == "TEXT_EXTRACTED" and len(rapid_text) >= 10:
        return {
            "raw_text": rapid_text,
            "engine": "RapidOCR",
            "confidence": int(rapid.get("confidence") or 0),
            "lines": [ln for ln in rapid_text.splitlines() if ln.strip()],
            "fallback_used": False,
        }

    tesseract = extract_text_with_tesseract(image_bytes)
    tess_text = str(tesseract.get("text") or "").strip()

    if tesseract.get("ocr_status") == "TEXT_EXTRACTED" and tess_text:
        return {
            "raw_text": tess_text,
            "engine": "Tesseract",
            "confidence": int(tesseract.get("confidence") or 0),
            "lines": [ln for ln in tess_text.splitlines() if ln.strip()],
            "fallback_used": True,
            "primary_engine_status": rapid.get("ocr_status"),
        }

    return {
        "raw_text": rapid_text,
        "engine": "RapidOCR",
        "confidence": int(rapid.get("confidence") or 0),
        "lines": [ln for ln in rapid_text.splitlines() if ln.strip()],
        "fallback_used": False,
        "fallback_engine_status": tesseract.get("ocr_status"),
    }


# Configure Tesseract au chargement du module si possible (léger, sans OCR).
configure_tesseract()
