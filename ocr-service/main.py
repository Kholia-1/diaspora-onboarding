"""ocr-service — microservice OCR Python (Phase 3 : moteur réel branché).

L'OCR (RapidOCR/ONNX modèle latin + fallback Tesseract) reste en Python : ce
service sans état reçoit une image et renvoie le texte OCR, les champs KYC
extraits et un score de qualité. Il est appelé par le backend Spring Boot via
l'adapter OcrRestAdapter (port hexagonal OcrPort).

Démarrage : uvicorn main:app --host 127.0.0.1 --port 8020
Auth interservices : en-tête X-API-Key comparé à la variable d'env OCR_SERVICE_API_KEY.
Ne JAMAIS exposer ce service via le tunnel public.

Le moteur RapidOCR (modèle ONNX) est chargé PARESSEUSEMENT au premier appel
d'extraction et mis en cache : /health reste instantané et le service reste
sans état (aucune base de données, modèle chargé une seule fois).
"""
import hmac
import os
import time

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from ocr import assess_quality, extract_fields, run_ocr

API_KEY = os.getenv("OCR_SERVICE_API_KEY", "")

app = FastAPI(
    title="Diaspora OCR Service",
    description="Microservice OCR interne (RapidOCR/Tesseract) appelé par le backend Spring Boot.",
    version="1.0.0",
)


def require_api_key(x_api_key: str | None):
    if not API_KEY:
        raise HTTPException(status_code=503, detail="OCR_SERVICE_API_KEY non configurée côté service.")
    if not x_api_key or not hmac.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Clé API invalide.")


@app.get("/health")
def health():
    """Sonde de vie — ne charge PAS le moteur OCR (reste instantané)."""
    return {"status": "ok", "service": "ocr-service", "engine": "rapidocr+tesseract"}


@app.post("/v1/ocr/extract")
async def extract(
    file: UploadFile = File(...),
    document_type: str = Form("UNKNOWN"),
    account_type: str = Form(""),
    x_api_key: str | None = Header(default=None),
):
    """Extraction réelle : OCR + champs KYC + qualité image."""
    require_api_key(x_api_key)

    started = time.perf_counter()
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide.")

    try:
        ocr_result = run_ocr(content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur OCR temporaire : {exc}")

    raw_text = ocr_result.get("raw_text", "") or ""

    fields = extract_fields(raw_text, document_type, account_type)
    quality = assess_quality(content)

    return {
        "raw_text": raw_text,
        "fields": fields,
        "quality": quality,
        "engine": ocr_result.get("engine"),
        "confidence": ocr_result.get("confidence"),
        "document_type": document_type,
        "account_type": account_type,
        "duration_ms": round((time.perf_counter() - started) * 1000),
    }


@app.post("/v1/ocr/quality")
async def quality(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None),
):
    """Scoring qualité image seul (pas d'OCR)."""
    require_api_key(x_api_key)

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide.")

    return assess_quality(content)
