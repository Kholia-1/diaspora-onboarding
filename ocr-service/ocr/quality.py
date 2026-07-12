"""quality.py — scoring qualité image (OpenCV).

Port fidèle de assess_image_quality() de app/services/document_auth_service.py :
luminosité, reflets/surexposition et netteté (variance du Laplacien).

API publique : assess_quality(image_bytes) -> {"score", "verdict", "issues": [...]}.
Les métriques brutes (brightness, laplacian_variance, glare_fraction) sont
conservées dans le retour à titre diagnostique.
"""
from typing import Any


def assess_quality(image_bytes: bytes) -> dict[str, Any]:
    """Contrôle luminosité, reflets et netteté d'une image.

    Retourne :
      - score   (0..100)     : quality_score du monolithe
      - verdict (str)        : "OK" | "LOW_QUALITY" | "NOT_ANALYZED"
      - issues  (list[str])  : constats (findings du monolithe)
    plus les métriques brutes brightness / laplacian_variance / glare_fraction.
    """
    issues: list[str] = []

    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore

        arr = np.frombuffer(image_bytes, dtype=np.uint8)
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
            issues.append("Image trop sombre")
        elif brightness > 210:
            score -= 25
            issues.append("Image trop claire")

        if glare_fraction > 0.10:
            score -= 25
            issues.append("Reflet ou surexposition détecté")

        if laplacian_variance < 70:
            score -= 40
            issues.append("Image floue")
        elif laplacian_variance < 120:
            score -= 15
            issues.append("Netteté moyenne")

        score = max(0, min(100, score))
        verdict = "OK" if score >= 65 else "LOW_QUALITY"

        return {
            "score": score,
            "verdict": verdict,
            "issues": issues or ["Qualité image acceptable"],
            "brightness": round(brightness, 2),
            "laplacian_variance": round(laplacian_variance, 2),
            "glare_fraction": round(glare_fraction, 4),
        }
    except Exception as exc:
        return {
            "score": 50,
            "verdict": "NOT_ANALYZED",
            "issues": [f"Contrôle qualité indisponible : {exc}"],
            "brightness": None,
            "laplacian_variance": None,
            "glare_fraction": None,
        }
