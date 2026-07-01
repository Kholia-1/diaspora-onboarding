import json
import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
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


def generate_account_number():
    now = datetime.utcnow().strftime("%y%m%d")
    suffix = random.randint(100000, 999999)

    return f"AFB{now}{suffix}"


def generate_rib(account_number):
    # RIB simulé pour prototype uniquement.
    return f"CM21 AFB 10001 00001 {account_number} 00"


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
def open_account_after_payment(application_reference: str, db: Session = Depends(get_db)):
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

    existing = db.query(AccountOpeningRecord).filter(
        AccountOpeningRecord.application_reference == application.reference
    ).first()

    if existing:
        application.status = "ACCOUNT_OPENED"

        whatsapp_notification = send_whatsapp_notification(
            phone=application_phone(application),
            event_type="COMPTE_OUVERT",
            context={
                "full_name": application_full_name(application),
                "reference": application.reference,
                "application_reference": application.reference,
                "account_number": existing.account_number,
                "final_rib": existing.rib,
            },
            dry_run=True
        )

        db.commit()

        return {
            "message": "Compte déjà ouvert pour ce dossier.",
            "application_status": application.status,
            "account": opening_payload(existing),
            "whatsapp_notification": whatsapp_notification
        }

    account_number = generate_account_number()
    rib = generate_rib(account_number)

    record = AccountOpeningRecord(
        application_id=application.id,
        application_reference=application.reference,
        client_email=getattr(application, "email", None),
        account_number=account_number,
        rib=rib,
        status="OPENED",
        raw_payload=json.dumps({
            "generated_by": "DIASPORA_ONBOARDING_PROTOTYPE",
            "generated_at": datetime.utcnow().isoformat(),
            "package_payment_reference": getattr(application, "package_payment_reference", None),
            "package_payment_status": getattr(application, "package_payment_status", None),
        }, ensure_ascii=False)
    )

    db.add(record)

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
        "message": "Compte ouvert avec succès en simulation.",
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
