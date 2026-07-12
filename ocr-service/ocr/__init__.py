"""Package ocr — moteur OCR réel du microservice.

Porté depuis le monolithe FastAPI (app/services/document_auth_service.py et
app/routers/pre_onboarding.py) sans en modifier la logique.

- engine.py     : RapidOCR (modèle latin ONNX) + fallback Tesseract → run_ocr()
- quality.py    : scoring qualité image OpenCV → assess_quality()
- extraction.py : extraction des champs KYC (MRZ / CNI / passeport / NIU / RCCM) → extract_fields()

Le service reste sans état : le modèle ONNX est chargé une seule fois (paresseusement).
"""

from .engine import run_ocr
from .extraction import extract_fields
from .quality import assess_quality

__all__ = ["run_ocr", "assess_quality", "extract_fields"]
