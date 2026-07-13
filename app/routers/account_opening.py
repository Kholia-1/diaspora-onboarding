import json
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PaymentTransaction, AccountApplication, AccountOpeningRecord
from app.services.whatsapp_notification_service import send_whatsapp_notification


from app.services.application_business_rules import can_open_account

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


def _basic_payment_gate_check(application):
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

    if not _basic_payment_gate_check(application):
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

    _assert_payment_ok_before_account_opening(application)


    # PAYMENT_GUARD_BEFORE_ACCOUNT_OPENED_V2
    payment = None
    if getattr(application, "package_payment_reference", None):
        payment = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.payment_reference == application.package_payment_reference)
            .first()
        )

    allowed_opening, opening_reason = can_open_account(application, payment)

    if not allowed_opening:
        raise HTTPException(
            status_code=403,
            detail={
                "status": "PAYMENT_REQUIRED_NOT_CONFIRMED",
                "message": opening_reason,
                "application_reference": application.reference,
                "package_payment_reference": getattr(application, "package_payment_reference", None),
                "package_payment_status": getattr(application, "package_payment_status", None),
                "payment_status": getattr(payment, "status", None) if payment else None,
            }
        )

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
        dry_run=None
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



# SERVER_PAYMENT_LOCK_BEFORE_ACCOUNT_OPENING_V1
def _safe_payment_float(value) -> float:
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _package_payment_required_before_account_opening(application) -> bool:
    """
    Détermine si le dossier nécessite un paiement package avant ouverture du compte.
    On utilise les champs métier déjà présents sur AccountApplication.
    """
    explicit_required = bool(getattr(application, "selected_package_payment_required", False))

    package_payment_status = str(
        getattr(application, "package_payment_status", "") or ""
    ).upper()

    stored_amount = _safe_payment_float(
        getattr(application, "package_payment_amount", 0)
    )

    selected_amount = (
        _safe_payment_float(getattr(application, "selected_package_opening_fee", 0))
        +
        _safe_payment_float(getattr(application, "selected_package_subscription_fee", 0))
    )

    if package_payment_status in ["NOT_REQUIRED", "NONE", ""] and not explicit_required and stored_amount <= 0 and selected_amount <= 0:
        return False

    return (
        explicit_required
        or stored_amount > 0
        or selected_amount > 0
        or package_payment_status in [
            "PENDING",
            "PAYMENT_PENDING",
            "APPROVED_PENDING_PAYMENT"
        ]
    )


def _package_payment_confirmed_before_account_opening(application) -> bool:
    """
    Paiement confirmé uniquement si le statut métier indique confirmation.
    """
    app_status = str(getattr(application, "status", "") or "").upper()
    package_payment_status = str(
        getattr(application, "package_payment_status", "") or ""
    ).upper()

    return (
        app_status in ["PAYMENT_CONFIRMED", "ACCOUNT_OPENED"]
        or package_payment_status in ["PAYMENT_CONFIRMED", "PAID"]
    )


def _assert_payment_ok_before_account_opening(application):
    """
    Verrou serveur : interdit l'ouverture du compte si le paiement package
    est requis mais non confirmé.
    """
    if not application:
        return

    payment_required = _package_payment_required_before_account_opening(application)
    payment_confirmed = _package_payment_confirmed_before_account_opening(application)

    if payment_required and not payment_confirmed:
        raise HTTPException(
            status_code=403,
            detail={
                "status": "PAYMENT_REQUIRED_NOT_CONFIRMED",
                "message": "Ouverture du compte bloquée : le paiement package est requis mais non confirmé.",
                "application_reference": getattr(application, "reference", None),
                "package_payment_reference": getattr(application, "package_payment_reference", None),
                "package_payment_status": getattr(application, "package_payment_status", None),
                "package_payment_amount": getattr(application, "package_payment_amount", None),
                "package_payment_currency": getattr(application, "package_payment_currency", None),
            }
        )
