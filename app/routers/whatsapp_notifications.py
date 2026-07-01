from fastapi import APIRouter, Body

from app.services.whatsapp_notification_service import send_whatsapp_notification

router = APIRouter(
    prefix="/api/backoffice/whatsapp",
    tags=["Notifications WhatsApp"]
)


@router.post("/test-message")
def test_whatsapp_message(payload: dict = Body(...)):
    phone = payload.get("phone")
    event_type = payload.get("event_type") or "DOSSIER_APPROUVE"
    context = payload.get("context") or {}
    dry_run = payload.get("dry_run", True)

    return send_whatsapp_notification(
        phone=phone,
        event_type=event_type,
        context=context,
        dry_run=bool(dry_run)
    )
