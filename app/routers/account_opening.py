import json
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountApplication, AccountOpeningRecord
from app.services.whatsapp_notification_service import send_whatsapp_notification


router = APIRouter(
    prefix="/api/backoffice/applications",
    tags=["Ouverture compte"]
)


def application_full_name(application):
    first_name = str(getattr(application, "first_name", "") or "").strip()
    last_name = str(getattr(application, "last_name", "") or "").strip()
    full_name = f"{first_name} {last_name}".strip()

    return full_name or "Cher client"


def application_phone(application):
    return (
        getattr(application, "phone", None)
        or getattr(application, "phone_number", None)
        or getattr(application, "whatsapp_phone", None)
        or ""
    )


def can_open_account(application):
    status = str(getattr(application, "status", "") or "").upper()
    payment_status = str(getattr(application, "package_payment_status", "") or "").upper()

    allowed_statuses = {
        "PAYMENT_CONFIRMED",
        "ACCOUNT_OPENED"
    }

    allowed_payment_statuses = {
        "PAID",
        "NOT_REQUIRED"
    }

    return status in allowed_statuses or payment_status in allowed_payment_statuses


def opening_payload(record: AccountOpeningRecord):
    return {
        "application_reference": record.application_reference,
        "client_email": record.client_email,
        "account_number": record.account_number,
        "rib": record.rib,
        "status": record.status,
        "created_at": record.created_at,
    }


@router.post("/{application_reference}/open-account")
def open_account_after_payment(
    application_reference: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Ouverture de compte après paiement confirmé.

    Important :
    - Le numéro de compte est saisi par le back-office ou récupéré du Core Banking.
    - Le RIB est saisi manuellement par le back-office.
    - Aucun RIB n'est généré automatiquement par Diaspora Onboarding.
    """

    application = db.query(AccountApplication).filter(
        AccountApplication.reference == application_reference
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")

    if not can_open_account(application):
        raise HTTPException(
            status_code=403,
            detail="Le compte ne peut être ouvert qu'après confirmation du paiement ou si aucun paiement n'est requis."
        )

    account_number = str(payload.get("account_number") or "").strip()
    rib = str(payload.get("rib") or "").strip()
    opened_by = str(payload.get("opened_by") or "BACKOFFICE").strip()
    comment = str(payload.get("comment") or "").strip()

    if not account_number:
        raise HTTPException(
            status_code=400,
            detail="Le numéro de compte est obligatoire."
        )

    if not rib:
        raise HTTPException(
            status_code=400,
            detail="Le RIB saisi par le back-office est obligatoire."
        )

    existing = db.query(AccountOpeningRecord).filter(
        AccountOpeningRecord.application_reference == application.reference
    ).first()

    raw_payload = {
        "source": "BACKOFFICE_MANUAL_INPUT",
        "opened_by": opened_by,
        "comment": comment,
        "saved_at": datetime.utcnow().isoformat(),
        "package_payment_reference": getattr(application, "package_payment_reference", None),
        "package_payment_status": getattr(application, "package_payment_status", None),
    }

    if existing:
        existing.account_number = account_number
        existing.rib = rib
        existing.status = "OPENED"
        existing.raw_payload = json.dumps(raw_payload, ensure_ascii=False)

        record = existing
        message = "Compte déjà ouvert. Informations compte/RIB mises à jour par le back-office."
    else:
        record = AccountOpeningRecord(
            application_id=application.id,
            application_reference=application.reference,
            client_email=getattr(application, "email", None),
            account_number=account_number,
            rib=rib,
            status="OPENED",
            raw_payload=json.dumps(raw_payload, ensure_ascii=False)
        )

        db.add(record)
        message = "Compte ouvert avec succès avec RIB saisi par le back-office."

    application.status = "ACCOUNT_OPENED"

    whatsapp_notification = send_whatsapp_notification(
        phone=application_phone(application),
        event_type="COMPTE_OUVERT",
        context={
            "full_name": application_full_name(application),
            "reference": application.reference,
            "application_reference": application.reference,
            "account_number": account_number,
            "final_rib": rib,
        },
        dry_run=True
    )

    db.commit()
    db.refresh(record)

    return {
        "message": message,
        "application_status": application.status,
        "account": opening_payload(record),
        "whatsapp_notification": whatsapp_notification
    }


@router.get("/{application_reference}/opened-account")
def get_opened_account(application_reference: str, db: Session = Depends(get_db)):
    record = db.query(AccountOpeningRecord).filter(
        AccountOpeningRecord.application_reference == application_reference
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Aucun compte ouvert pour ce dossier.")

    return opening_payload(record)
