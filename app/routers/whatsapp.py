import os
from fastapi import APIRouter, Header, HTTPException, HTTPException, Header, HTTPException
from pydantic import BaseModel

from app.services.whatsapp_service import (
    whatsapp_is_enabled,
    get_callbell_config,
    validate_callbell_config,
    send_whatsapp_message,
    normalize_phone_number,
)


router = APIRouter(
    prefix="/api/whatsapp",
    tags=["WhatsApp Callbell"]
)


class WhatsAppTestRequest(BaseModel):
    to: str
    message: str


def require_test_key(x_whatsapp_test_key: str | None):
    expected_key = os.getenv("WHATSAPP_TEST_KEY")

    if not expected_key:
        raise HTTPException(
            status_code=403,
            detail="WHATSAPP_TEST_KEY n'est pas configuré côté serveur."
        )

    if x_whatsapp_test_key != expected_key:
        raise HTTPException(
            status_code=403,
            detail="Clé de test WhatsApp invalide."
        )


@router.get("/status")
async def whatsapp_status():
    config = get_callbell_config()
    missing = validate_callbell_config()

    return {
        "enabled": whatsapp_is_enabled(),
        "provider": "CALLBELL",
        "api_url": config["api_url"],
        "has_bearer_token": bool(config["bearer_token"]),
        "has_channel_uuid": bool(config["channel_uuid"]),
        "has_template_uuid": bool(config["template_uuid"]),
        "configuration_ok": len(missing) == 0,
        "missing": missing,
    }


@router.post("/test-send")
async def whatsapp_test_send(
    payload: WhatsAppTestRequest,
    x_whatsapp_test_key: str | None = Header(default=None)
):
    require_test_key(x_whatsapp_test_key)

    result = send_whatsapp_message(
        to_phone=payload.to,
        message=payload.message
    )

    return {
        "input_to": payload.to,
        "normalized_to": normalize_phone_number(payload.to),
        "result": result,
    }


# AFB_WHATSAPP_REAL_TEST_ROUTE_V1
class WhatsAppTestRequest(BaseModel):
    to: str
    message: str


@router.post("/test")
def test_whatsapp_real_message(
    payload: WhatsAppTestRequest,
    x_whatsapp_test_key: str | None = Header(default=None),
):
    expected_key = os.getenv("WHATSAPP_TEST_KEY", "")

    if expected_key and x_whatsapp_test_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid WhatsApp test key")

    return send_whatsapp_message(payload.to, payload.message)

