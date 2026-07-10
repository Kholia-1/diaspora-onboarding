"""ocr-service — microservice OCR Python (Phase 0 : squelette).

L'OCR (RapidOCR/ONNX + fallback Tesseract) reste en Python : ce service sans état
reçoit une image et renvoie les champs extraits + un score de qualité. Il est appelé
par le backend Spring Boot via l'adapter OcrRestAdapter (port hexagonal OcrPort).

Démarrage : uvicorn main:app --host 127.0.0.1 --port 8020
Auth interservices : en-tête X-API-Key comparé à la variable d'env OCR_SERVICE_API_KEY.
Ne JAMAIS exposer ce service via le tunnel public.

Phase 3 : le moteur complet sera extrait de app/services/document_auth_service.py
(RapidOCR, Tesseract, scoring OpenCV) et app/routers/pre_onboarding.py
(extract_prefill_fields, extraction MRZ/CNI/passeport).
"""
import hmac
import os
import time

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

API_KEY = os.getenv("OCR_SERVICE_API_KEY", "")

app = FastAPI(
    title="Diaspora OCR Service",
    description="Microservice OCR interne (RapidOCR/Tesseract) appelé par le backend Spring Boot.",
    version="0.1.0",
)


def require_api_key(x_api_key: str | None):
    if not API_KEY:
        raise HTTPException(status_code=503, detail="OCR_SERVICE_API_KEY non configurée côté service.")
    if not x_api_key or not hmac.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Clé API invalide.")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ocr-service", "engine": "stub"}


@app.post("/v1/ocr/extract")
async def extract(
    file: UploadFile = File(...),
    document_type: str = Form("UNKNOWN"),
    account_type: str = Form(""),
    x_api_key: str | None = Header(default=None),
):
    """Phase 3 : extraction réelle. Pour l'instant, écho de contrôle (stub)."""
    require_api_key(x_api_key)

    started = time.perf_counter()
    content = await file.read()

    return {
        "raw_text": "",
        "fields": {},
        "quality": {"score": 0, "verdict": "NOT_IMPLEMENTED", "issues": ["Moteur OCR non branché (Phase 3)"]},
        "engine": "stub",
        "document_type": document_type,
        "account_type": account_type,
        "received_bytes": len(content),
        "duration_ms": round((time.perf_counter() - started) * 1000),
    }


@app.post("/v1/ocr/quality")
async def quality(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None),
):
    require_api_key(x_api_key)
    content = await file.read()
    return {
        "score": 0,
        "verdict": "NOT_IMPLEMENTED",
        "issues": ["Scoring qualité non branché (Phase 3)"],
        "received_bytes": len(content),
    }
