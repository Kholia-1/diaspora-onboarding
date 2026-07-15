"""AFB_FACE_MATCH_V2 — détection, embedding et vérification d'identité faciale.

Pipeline (tout local, CPU, sans appel réseau au runtime) :
- Détection + 5 points de repère : YuNet (face_detection_yunet_2023mar.onnx).
- Embedding d'identité : **ArcFace** (InsightFace buffalo_l, w600k_r50, ONNX) si le
  modèle est présent — état de l'art open-source ; repli sur **SFace** (OpenCV Zoo)
  sinon. Les deux produisent des embeddings L2-normalisés → similarité = produit
  scalaire (cosinus).

Améliorations vs V1 :
1. ArcFace (bien plus robuste que SFace sur les cas difficiles CNI↔selfie).
2. Alignement ArcFace 5-points (similarity transform vers le gabarit canonique).
3. Gating qualité (score détection, taille, flou, frontalité) : on n'embed que des
   visages exploitables → moins d'embeddings bruités, moins de faux positifs.
4. Template vidéo robuste : moyenne des embeddings normalisés des meilleures frames
   (au lieu du simple « meilleur cosinus » de V1, trop permissif).
5. Vérification CROISÉE vidéo↔selfie↔CNI avec seuils par type de paire
   (« live » vs « document », la CNI étant une source dégradée).
6. Upscale de la photo CNI (petite/basse résolution) avant détection.

Usage principal : confirmer que la personne de la vidéo (liveness), de la photo
(selfie) et de la photo de la CNI est bien la MÊME.
"""
from __future__ import annotations

import json
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
YUNET_PATH = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
SFACE_PATH = MODELS_DIR / "face_recognition_sface_2021dec.onnx"
ARCFACE_PATH = MODELS_DIR / "face_recognition_arcface_w600k_r50.onnx"

# Gabarit d'alignement ArcFace (5 points, sortie 112x112) — standard InsightFace.
# L'ordre des repères YuNet (œil droit, œil gauche, nez, coin bouche droit, gauche)
# correspond positionnellement à ce gabarit, donc aucun réordonnancement nécessaire.
ARCFACE_DST = np.array(
    [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366],
     [41.5493, 92.3655], [70.7299, 92.2041]],
    dtype=np.float32,
)

# Seuils de similarité cosinus (embeddings L2-normalisés). Par type de paire :
# - "live"     : deux sources vivantes (vidéo, selfie) — genuine pairs à haut score.
# - "document" : une source est la photo CNI (imprimée, basse déf, ancienne) →
#                les paires genuine y scorent plus bas → seuil plus tolérant.
#
# Calibrage ArcFace observé sur les sessions réelles (uploads/applications/*) :
#   genuine live (vidéo↔selfie)   : 0.74 – 0.95   (même personne, y c. inter-sessions)
#   genuine document (vidéo↔CNI)  : 0.43 – 0.71   (min genuine observé ≈ 0.427)
#   impostor (vrais tiers)        : ≈ -0.15 – 0.10 (rejet net)
# Les seuils sont placés SOUS le plus bas genuine et AU-DESSUS du bruit impostor.
# À ré-affiner sur un jeu étiqueté plus large avec un objectif de FAR (KYC : on
# privilégie un faible taux de faux positifs). La règle croisée (verify_identity)
# exige en plus vidéo↔selfie ET vidéo↔CNI, ce qui protège d'un faux positif
# sur une seule paire.
THRESHOLDS: dict[str, dict[str, float]] = {
    "arcface": {"live": 0.42, "document": 0.30},
    "sface": {"live": 0.363, "document": 0.30},
}

# Gating qualité.
MIN_DETECTION_SCORE = 0.75          # score YuNet du visage
MIN_FACE_SIZE_PX = 48               # min(largeur, hauteur) de la boîte, en pixels image
MIN_BLUR_VAR = 40.0                 # variance du Laplacien sur le crop aligné (flou si <)
MAX_YAW_RATIO = 0.28                # décalage horizontal nez/yeux (proxy de lacet)
MAX_ROLL_DEG = 35.0                 # inclinaison (roulis) tolérée

_lock = threading.Lock()
_detector = None
_sface = None
_arcface = None            # onnxruntime.InferenceSession | None
_arcface_io: tuple[str, str] | None = None
_recognizer_kind: str | None = None


def models_available() -> bool:
    """Détection + au moins un recogniseur (ArcFace ou SFace)."""
    return YUNET_PATH.exists() and (ARCFACE_PATH.exists() or SFACE_PATH.exists())


def recognizer_kind() -> str:
    """'arcface' si le modèle ArcFace est présent, sinon 'sface'."""
    return "arcface" if ARCFACE_PATH.exists() else "sface"


def _get_detector():
    global _detector
    with _lock:
        if _detector is None:
            _detector = cv2.FaceDetectorYN.create(
                str(YUNET_PATH), "", (320, 320), 0.7, 0.3, 5000
            )
    return _detector


def _get_recognizer():
    """Charge (paresseusement) le recogniseur : ArcFace en priorité, sinon SFace."""
    global _sface, _arcface, _arcface_io, _recognizer_kind

    with _lock:
        if _recognizer_kind is not None:
            return _recognizer_kind

        if ARCFACE_PATH.exists():
            import onnxruntime as ort

            so = ort.SessionOptions()
            so.intra_op_num_threads = max(1, (os.cpu_count() or 2) // 2)
            _arcface = ort.InferenceSession(
                str(ARCFACE_PATH), sess_options=so, providers=["CPUExecutionProvider"]
            )
            _arcface_io = (_arcface.get_inputs()[0].name, _arcface.get_outputs()[0].name)
            _recognizer_kind = "arcface"
        elif SFACE_PATH.exists():
            _sface = cv2.FaceRecognizerSF.create(str(SFACE_PATH), "")
            _recognizer_kind = "sface"
        else:
            _recognizer_kind = "none"

    return _recognizer_kind


# --------------------------------------------------------------------------- #
# Détection + repères
# --------------------------------------------------------------------------- #
def _resize_for_detection(image: np.ndarray, max_side: int = 1024) -> tuple[np.ndarray, float]:
    h, w = image.shape[:2]
    scale = min(1.0, max_side / max(h, w))
    if scale < 1.0:
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
    return image, scale


def detect_largest_face(image: np.ndarray) -> np.ndarray | None:
    """Ligne YuNet du plus grand visage (coordonnées de l'image donnée)."""
    detector = _get_detector()
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


# --------------------------------------------------------------------------- #
# Qualité
# --------------------------------------------------------------------------- #
def _face_quality(image: np.ndarray, face_row: np.ndarray, aligned: np.ndarray) -> dict[str, Any]:
    """Évalue la qualité d'un visage détecté ; `usable` = exploitable pour le KYC."""
    x, y, w, h = face_row[0:4]
    score = float(face_row[14])
    landmarks = face_row[4:14].reshape(5, 2)

    right_eye, left_eye, nose = landmarks[0], landmarks[1], landmarks[2]
    eye_dist = float(np.linalg.norm(left_eye - right_eye)) or 1.0
    eye_mid = (left_eye + right_eye) / 2.0

    # Lacet (yaw) : décalage horizontal du nez vs milieu des yeux, normalisé.
    yaw_ratio = abs(float(nose[0] - eye_mid[0])) / eye_dist
    # Roulis (roll) : angle de la ligne des yeux.
    roll_deg = abs(float(np.degrees(np.arctan2(left_eye[1] - right_eye[1],
                                               left_eye[0] - right_eye[0]))))
    if roll_deg > 90:
        roll_deg = 180 - roll_deg

    gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    min_side = float(min(w, h))

    reasons = []
    if score < MIN_DETECTION_SCORE:
        reasons.append("low_detection_score")
    if min_side < MIN_FACE_SIZE_PX:
        reasons.append("face_too_small")
    if blur_var < MIN_BLUR_VAR:
        reasons.append("blurry")
    if yaw_ratio > MAX_YAW_RATIO:
        reasons.append("not_frontal_yaw")
    if roll_deg > MAX_ROLL_DEG:
        reasons.append("tilted_roll")

    return {
        "usable": not reasons,
        "detection_score": round(score, 3),
        "face_min_px": round(min_side, 1),
        "blur_var": round(blur_var, 1),
        "yaw_ratio": round(yaw_ratio, 3),
        "roll_deg": round(roll_deg, 1),
        "reasons": reasons,
        # Score de qualité agrégé (0..1) pour classer les frames vidéo.
        "quality": round(_quality_score(score, min_side, blur_var, yaw_ratio, roll_deg), 4),
    }


def _quality_score(score: float, min_side: float, blur_var: float,
                   yaw_ratio: float, roll_deg: float) -> float:
    s = min(1.0, score)
    sz = min(1.0, min_side / 160.0)
    bl = min(1.0, blur_var / 300.0)
    fr = max(0.0, 1.0 - yaw_ratio / 0.4)
    rl = max(0.0, 1.0 - roll_deg / 45.0)
    return 0.30 * s + 0.20 * sz + 0.20 * bl + 0.20 * fr + 0.10 * rl


# --------------------------------------------------------------------------- #
# Alignement + embedding
# --------------------------------------------------------------------------- #
def _align_arcface(image: np.ndarray, face_row: np.ndarray) -> np.ndarray:
    src = face_row[4:14].reshape(5, 2).astype(np.float32)
    matrix, _ = cv2.estimateAffinePartial2D(src, ARCFACE_DST, method=cv2.LMEDS)
    if matrix is None:
        # Repli : crop de la boîte redimensionné (rare, si transform impossible).
        x, y, w, h = [int(v) for v in face_row[0:4]]
        crop = image[max(0, y):y + h, max(0, x):x + w]
        return cv2.resize(crop, (112, 112)) if crop.size else np.zeros((112, 112, 3), np.uint8)
    return cv2.warpAffine(image, matrix, (112, 112), borderValue=(0, 0, 0))


def _embed_aligned(aligned_bgr: np.ndarray) -> np.ndarray:
    """Embedding L2-normalisé du crop aligné 112x112, selon le recogniseur actif."""
    kind = _get_recognizer()

    if kind == "arcface":
        rgb = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
        blob = (rgb - 127.5) / 128.0
        blob = np.transpose(blob, (2, 0, 1))[None, ...]  # NCHW
        in_name, out_name = _arcface_io  # type: ignore[misc]
        with _lock:
            feat = _arcface.run([out_name], {in_name: blob})[0][0]  # type: ignore[union-attr]
    elif kind == "sface":
        with _lock:
            feat = _sface.feature(aligned_bgr)[0].copy()  # type: ignore[union-attr]
    else:
        raise RuntimeError("Aucun recogniseur disponible (ArcFace/SFace absents).")

    feat = np.asarray(feat, dtype=np.float32).ravel()
    norm = float(np.linalg.norm(feat)) or 1.0
    return feat / norm


def _embed_face(image: np.ndarray, face_row: np.ndarray) -> tuple[np.ndarray, dict[str, Any]]:
    aligned = _align_arcface(image, face_row)
    quality = _face_quality(image, face_row, aligned)
    return _embed_aligned(aligned), quality


def _cosine(f1: np.ndarray, f2: np.ndarray) -> float:
    return float(np.dot(f1, f2))  # embeddings déjà L2-normalisés


# --------------------------------------------------------------------------- #
# Embedding d'un fichier image / vidéo
# --------------------------------------------------------------------------- #
def embed_image_file(path: str | Path, upscale_small: bool = False) -> dict[str, Any]:
    """Embedding du plus grand visage d'une image (essaie 0/90/180/270° : CNI tournée).

    `upscale_small` : agrandit l'image si petite (photo CNI basse résolution) pour
    améliorer détection + alignement.
    """
    data = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        return {"status": "UNREADABLE_IMAGE"}

    if upscale_small:
        h, w = image.shape[:2]
        if max(h, w) < 700:
            f = 700.0 / max(h, w)
            image = cv2.resize(image, (int(w * f), int(h * f)), interpolation=cv2.INTER_CUBIC)

    rotations = [(None, 0), (cv2.ROTATE_90_CLOCKWISE, 90),
                 (cv2.ROTATE_90_COUNTERCLOCKWISE, 270), (cv2.ROTATE_180, 180)]

    best = None
    for rotation, degrees in rotations:
        candidate = image if rotation is None else cv2.rotate(image, rotation)
        face = detect_largest_face(candidate)
        if face is None:
            continue
        feature, quality = _embed_face(candidate, face)
        cand = {"status": "OK", "feature": feature, "quality": quality, "rotation_degrees": degrees}
        # On garde la rotation qui donne le meilleur visage exploitable.
        if best is None or quality["quality"] > best["quality"]["quality"]:
            best = cand
        if quality["usable"]:
            return cand

    return best if best is not None else {"status": "NO_FACE_DETECTED"}


def embed_video_file(path: str | Path, max_samples: int = 16, keep_top: int = 6) -> dict[str, Any]:
    """Échantillonne la vidéo, embed les visages exploitables, et agrège un TEMPLATE
    robuste (moyenne L2-normalisée des `keep_top` meilleures frames)."""
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        return {"status": "UNREADABLE_VIDEO"}

    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, total // max_samples) if total > 0 else 8

    candidates: list[dict[str, Any]] = []
    frames_checked = 0
    frames_with_face = 0
    index = 0

    while True:
        if not capture.grab():
            break
        if index % step == 0 and frames_checked < max_samples:
            ok, frame = capture.retrieve()
            if ok and frame is not None:
                frames_checked += 1
                face = detect_largest_face(frame)
                if face is not None:
                    frames_with_face += 1
                    feature, quality = _embed_face(frame, face)
                    candidates.append({"feature": feature, "quality": quality})
        index += 1

    capture.release()

    liveness = {
        "frames_checked": frames_checked,
        "frames_with_face": frames_with_face,
        "face_ratio": round(frames_with_face / frames_checked, 3) if frames_checked else 0.0,
    }

    usable = [c for c in candidates if c["quality"]["usable"]] or candidates
    if not usable:
        return {"status": "NO_FACE_DETECTED", "liveness": liveness}

    usable.sort(key=lambda c: c["quality"]["quality"], reverse=True)
    top = usable[:keep_top]
    template = np.mean([c["feature"] for c in top], axis=0)
    template /= float(np.linalg.norm(template)) or 1.0

    return {
        "status": "OK",
        "feature": template.astype(np.float32),
        "features": [c["feature"] for c in top],
        "quality": top[0]["quality"],
        "liveness": liveness,
        "samples_used": len(top),
    }


# --------------------------------------------------------------------------- #
# Vérification croisée vidéo ↔ selfie ↔ CNI
# --------------------------------------------------------------------------- #
def _pair_threshold(kind: str, pair: str) -> float:
    is_doc = "cni" in pair
    return THRESHOLDS[kind]["document" if is_doc else "live"]


def verify_identity(video_path: str | Path | None,
                    selfie_path: str | Path | None,
                    cni_path: str | Path | None) -> dict[str, Any]:
    """Vérifie que vidéo, selfie et photo CNI sont la MÊME personne.

    Verdict : il faut au minimum la vidéo (liveness) ET la CNI (référence d'identité)
    avec des visages exploitables ; les paires décisives (vidéo↔CNI, et vidéo↔selfie
    si selfie fournie) doivent toutes dépasser leur seuil.
    """
    if not models_available():
        return {"status": "MODELS_MISSING",
                "message": "Modèles YuNet + (ArcFace ou SFace) absents de app/models/."}

    kind = _get_recognizer()

    embeds: dict[str, dict[str, Any]] = {}
    if video_path:
        embeds["video"] = embed_video_file(video_path)
    if selfie_path:
        embeds["selfie"] = embed_image_file(selfie_path)
    if cni_path:
        embeds["cni"] = embed_image_file(cni_path, upscale_small=True)

    sources = {
        name: {
            "present": True,
            "status": e.get("status"),
            "quality": e.get("quality"),
            **({"liveness": e["liveness"]} if "liveness" in e else {}),
        }
        for name, e in embeds.items()
    }

    def feat(name: str):
        e = embeds.get(name)
        return e["feature"] if e and e.get("status") == "OK" else None

    pairs: dict[str, Any] = {}
    for a, b in (("video", "selfie"), ("video", "cni"), ("selfie", "cni")):
        fa, fb = feat(a), feat(b)
        if fa is None or fb is None:
            continue
        pair = f"{a}_{b}"
        cos = _cosine(fa, fb)
        thr = _pair_threshold(kind, pair)
        pairs[pair] = {"cosine_similarity": round(cos, 4), "threshold": thr,
                       "match": cos >= thr, "margin": round(cos - thr, 4)}

    # Verdict global : vidéo + CNI obligatoires, paires décisives toutes MATCH.
    reasons: list[str] = []
    if feat("video") is None:
        reasons.append("NO_FACE_VIDEO" if "video" in embeds else "NO_VIDEO")
    if feat("cni") is None:
        reasons.append("NO_FACE_CNI" if "cni" in embeds else "NO_CNI")

    decisive = [p for p in ("video_cni", "video_selfie") if p in pairs]
    match = bool(not reasons and decisive and all(pairs[p]["match"] for p in decisive))
    confidence = round(min((pairs[p]["margin"] for p in decisive), default=-1.0), 4) if decisive else -1.0

    if not reasons and not decisive:
        reasons.append("NOT_ENOUGH_SOURCES")

    return {
        "status": "OK" if (decisive and not reasons) else "INCOMPLETE",
        "match": match,
        "confidence": confidence,
        "recognizer": kind,
        "sources": sources,
        "pairs": pairs,
        "reasons": reasons,
        "computed_at": datetime.utcnow().isoformat() + "Z",
    }


# --------------------------------------------------------------------------- #
# Compat rétro : compare vidéo → plusieurs références (legacy)
# --------------------------------------------------------------------------- #
def compare_video_to_references(video_path: str | Path,
                                references: dict[str, str | Path]) -> dict[str, Any]:
    """Compare la vidéo (template robuste) à chaque image de référence.

    Conserve la forme de sortie V1 (clé `references`) + enrichit (recogniseur,
    liveness, template). Utilisé par run_session_face_match.
    """
    if not models_available():
        return {"status": "MODELS_MISSING",
                "message": "Modèles YuNet + (ArcFace ou SFace) absents de app/models/."}

    kind = _get_recognizer()
    video = embed_video_file(video_path)

    result: dict[str, Any] = {
        "status": "OK" if video.get("status") == "OK" else video.get("status"),
        "recognizer": kind,
        "liveness": video.get("liveness"),
        "video_frames_checked": (video.get("liveness") or {}).get("frames_checked"),
        "video_frames_with_face": (video.get("liveness") or {}).get("frames_with_face"),
        "references": {},
        "computed_at": datetime.utcnow().isoformat() + "Z",
    }

    if video.get("status") != "OK":
        return result

    for name, ref_path in references.items():
        is_doc = "cni" in name.lower()
        ref = embed_image_file(ref_path, upscale_small=is_doc)
        if ref.get("status") != "OK":
            result["references"][name] = {"status": ref.get("status")}
            continue

        cos = _cosine(video["feature"], ref["feature"])
        thr = THRESHOLDS[kind]["document" if is_doc else "live"]
        result["references"][name] = {
            "status": "MATCH" if cos >= thr else "MISMATCH",
            "cosine_similarity": round(cos, 4),
            "threshold": thr,
            "quality": ref.get("quality", {}).get("quality"),
        }

    return result


def run_session_face_match(session_dir: str | Path) -> dict[str, Any]:
    """Compare la dernière vidéo de la session aux références (CNI, selfie) et
    persiste le résultat. Ajoute la vérification croisée `identity`."""
    session_dir = Path(session_dir)

    def latest(pattern: str) -> Path | None:
        files = sorted((p for p in session_dir.glob(pattern) if p.suffix.lower() != ".json"),
                       key=lambda p: p.stat().st_mtime)
        return files[-1] if files else None

    video = latest("CLIENT_VIDEO_*")
    if not video:
        return {"status": "NO_VIDEO"}

    references: dict[str, str | Path] = {}
    for key, pattern in (("cni_recto", "CNI_RECTO_*"), ("cni_verso", "CNI_VERSO_*"),
                         ("client_photo", "CLIENT_PHOTO_*")):
        found = latest(pattern)
        if found:
            references[key] = found

    if not references:
        return {"status": "NO_REFERENCES"}

    result = compare_video_to_references(video, references)
    result["video_file"] = video.name
    result["reference_files"] = {k: Path(v).name for k, v in references.items()}

    # Vérification croisée (verdict global vidéo↔selfie↔CNI). La CNI porteuse du
    # visage est en général le recto.
    result["identity"] = verify_identity(
        video_path=video,
        selfie_path=references.get("client_photo"),
        cni_path=references.get("cni_recto") or references.get("cni_verso"),
    )

    try:
        (session_dir / "face_match.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2, default=float), encoding="utf-8"
        )
    except Exception:
        pass

    return result
