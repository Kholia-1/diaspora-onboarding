"""AFB_FACE_MATCH_V1 — détection et comparaison faciale locales.

Modèles OpenCV Zoo (dans app/models/) :
- YuNet  : détection de visage (face_detection_yunet_2023mar.onnx) ;
- SFace  : embedding + comparaison d'identité (face_recognition_sface_2021dec.onnx).

Usage principal : comparer la vidéo du client avec la photo portrait de sa CNI
et avec sa photo (selfie). Seuil officiel OpenCV pour SFace en similarité
cosinus : >= 0.363 -> même personne.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
YUNET_PATH = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
SFACE_PATH = MODELS_DIR / "face_recognition_sface_2021dec.onnx"

# Seuil officiel OpenCV Zoo pour SFace (cosine similarity).
COSINE_MATCH_THRESHOLD = 0.363

_lock = threading.Lock()
_detector = None
_recognizer = None


def models_available() -> bool:
    return YUNET_PATH.exists() and SFACE_PATH.exists()


def _get_engines():
    global _detector, _recognizer

    with _lock:
        if _detector is None:
            _detector = cv2.FaceDetectorYN.create(
                str(YUNET_PATH), "", (320, 320), 0.7, 0.3, 5000
            )
        if _recognizer is None:
            _recognizer = cv2.FaceRecognizerSF.create(str(SFACE_PATH), "")

    return _detector, _recognizer


def _resize_for_detection(image: np.ndarray, max_side: int = 1024) -> tuple[np.ndarray, float]:
    h, w = image.shape[:2]
    scale = min(1.0, max_side / max(h, w))
    if scale < 1.0:
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
    return image, scale


def detect_largest_face(image: np.ndarray) -> np.ndarray | None:
    """Retourne la ligne YuNet du plus grand visage (coordonnées de l'image donnée)."""
    detector, _ = _get_engines()

    resized, scale = _resize_for_detection(image)
    h, w = resized.shape[:2]

    with _lock:
        detector.setInputSize((w, h))
        _, faces = detector.detect(resized)

    if faces is None or len(faces) == 0:
        return None

    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    face = faces[0].copy()

    if scale < 1.0:
        face[:14] = face[:14] / scale

    return face


def _embed_face(image: np.ndarray, face_row: np.ndarray) -> np.ndarray:
    _, recognizer = _get_engines()
    with _lock:
        aligned = recognizer.alignCrop(image, face_row)
        return recognizer.feature(aligned).copy()


def _cosine(f1: np.ndarray, f2: np.ndarray) -> float:
    _, recognizer = _get_engines()
    with _lock:
        return float(recognizer.match(f1, f2, cv2.FaceRecognizerSF_FR_COSINE))


def embed_image_file(path: str | Path) -> dict[str, Any]:
    """Détecte le plus grand visage d'une image et retourne son embedding."""
    data = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)

    if image is None:
        return {"status": "UNREADABLE_IMAGE"}

    face = detect_largest_face(image)
    if face is None:
        return {"status": "NO_FACE_DETECTED"}

    return {
        "status": "OK",
        "feature": _embed_face(image, face),
        "detection_score": float(face[14]),
    }


def embed_video_file(path: str | Path, max_samples: int = 8) -> dict[str, Any]:
    """Échantillonne la vidéo et retourne les embeddings des visages trouvés."""
    capture = cv2.VideoCapture(str(path))

    if not capture.isOpened():
        return {"status": "UNREADABLE_VIDEO"}

    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, total // max_samples) if total > 0 else 12

    features = []
    frames_with_face = 0
    frames_checked = 0
    index = 0

    while True:
        ok = capture.grab()
        if not ok:
            break

        if index % step == 0 and frames_checked < max_samples:
            ok, frame = capture.retrieve()
            if ok and frame is not None:
                frames_checked += 1
                face = detect_largest_face(frame)
                if face is not None:
                    frames_with_face += 1
                    features.append(_embed_face(frame, face))

        index += 1

    capture.release()

    if not features:
        return {
            "status": "NO_FACE_DETECTED",
            "frames_checked": frames_checked,
        }

    return {
        "status": "OK",
        "features": features,
        "frames_checked": frames_checked,
        "frames_with_face": frames_with_face,
    }


def compare_video_to_references(video_path: str | Path, references: dict[str, str | Path]) -> dict[str, Any]:
    """Compare la vidéo à chaque image de référence (CNI, photo client...).

    Retourne, par référence : la meilleure similarité cosinus sur les frames
    échantillonnées et le verdict MATCH / MISMATCH / NO_FACE_*.
    """
    if not models_available():
        return {
            "status": "MODELS_MISSING",
            "message": "Modèles YuNet/SFace absents de app/models/.",
        }

    video = embed_video_file(video_path)

    result: dict[str, Any] = {
        "status": "OK" if video.get("status") == "OK" else video.get("status"),
        "video_frames_checked": video.get("frames_checked"),
        "video_frames_with_face": video.get("frames_with_face"),
        "threshold": COSINE_MATCH_THRESHOLD,
        "references": {},
        "computed_at": datetime.utcnow().isoformat() + "Z",
    }

    if video.get("status") != "OK":
        return result

    for name, ref_path in references.items():
        ref = embed_image_file(ref_path)

        if ref.get("status") != "OK":
            result["references"][name] = {"status": ref.get("status")}
            continue

        best = max(_cosine(feature, ref["feature"]) for feature in video["features"])

        result["references"][name] = {
            "status": "MATCH" if best >= COSINE_MATCH_THRESHOLD else "MISMATCH",
            "cosine_similarity": round(best, 4),
            "detection_score": round(ref.get("detection_score", 0.0), 3),
        }

    return result


def run_session_face_match(session_dir: str | Path) -> dict[str, Any]:
    """Compare la dernière vidéo de la session aux photos de référence
    (CNI recto/verso, photo client) et persiste le résultat."""
    session_dir = Path(session_dir)

    def latest(pattern: str) -> Path | None:
        files = sorted(
            (p for p in session_dir.glob(pattern) if p.suffix.lower() != ".json"),
            key=lambda p: p.stat().st_mtime,
        )
        return files[-1] if files else None

    video = latest("CLIENT_VIDEO_*")

    if not video:
        return {"status": "NO_VIDEO"}

    references: dict[str, str | Path] = {}
    for key, pattern in (
        ("cni_recto", "CNI_RECTO_*"),
        ("cni_verso", "CNI_VERSO_*"),
        ("client_photo", "CLIENT_PHOTO_*"),
    ):
        found = latest(pattern)
        if found:
            references[key] = found

    if not references:
        return {"status": "NO_REFERENCES"}

    result = compare_video_to_references(video, references)
    result["video_file"] = video.name
    result["reference_files"] = {k: Path(v).name for k, v in references.items()}

    try:
        (session_dir / "face_match.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception:
        pass

    return result
