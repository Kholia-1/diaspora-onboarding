import json
import re
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import SessionLocal
from app.models import AccountApplication, PaymentTransaction
from app.services.mastercard_gateway_service import public_config_status
from app.services.mastercard_payment_service import create_mastercard_payment_session
from app.services.whatsapp_notification_service import send_whatsapp_notification


router = APIRouter(
    prefix="/api/client/payment-link",
    tags=["Client Payment Link"],
)


class ClientPaymentLinkRequest(BaseModel):
    application_reference: str
    identifier: str
    send_whatsapp: Optional[bool] = False


def _clean_phone(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\D+", "", str(value))


def _identifier_matches(app: AccountApplication, identifier: str) -> bool:
    value = (identifier or "").strip().lower()

    if not value:
        return False

    app_email = (app.email or "").strip().lower()

    if app_email and value == app_email:
        return True

    input_phone = _clean_phone(value)
    app_phone = _clean_phone(app.phone)

    if not input_phone or not app_phone:
        return False

    if input_phone == app_phone:
        return True

    # Exemple : 671918275 doit matcher +237671918275
    if app_phone.endswith(input_phone):
        return True

    if input_phone.endswith(app_phone):
        return True

    return False


def _is_payment_already_confirmed(app: AccountApplication, payment: PaymentTransaction | None) -> bool:
    app_status = str(app.package_payment_status or app.status or "").upper()
    payment_status = str(payment.status if payment else "").upper()

    return (
        app_status in {"PAYMENT_CONFIRMED", "PAID", "ACCOUNT_OPENED"}
        or payment_status in {"PAID", "PAYMENT_CONFIRMED"}
    )


def _can_generate_payment_link(app: AccountApplication):
    status = str(app.status or "").upper()
    decision = str(app.review_decision or "").upper()

    if decision != "APPROVED" and status not in {"APPROVED", "APPROVED_PENDING_PAYMENT", "PAYMENT_PENDING"}:
        return False, "Le dossier n'est pas encore approuvé pour paiement."

    if not bool(app.selected_package_payment_required):
        return False, "Aucun paiement n'est requis pour ce dossier."

    return True, "OK"


def _absolute_payment_url(relative_or_full_url: str | None) -> str | None:
    if not relative_or_full_url:
        return None

    value = str(relative_or_full_url).strip()

    if value.startswith("http://") or value.startswith("https://"):
        return value

    config = public_config_status()
    base = (
        config.get("merchant_url")
        or "https://diaspora-onboarding.com"
    ).rstrip("/")

    if not value.startswith("/"):
        value = "/" + value

    return base + value


def _find_existing_payment(db, app: AccountApplication):
    if app.package_payment_reference:
        payment = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.payment_reference == app.package_payment_reference)
            .first()
        )
        if payment:
            return payment

    return (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.application_reference == app.reference)
        .order_by(PaymentTransaction.created_at.desc())
        .first()
    )


def _create_payment_record(db, app: AccountApplication):
    amount = (
        app.selected_package_opening_fee
        or app.selected_package_subscription_fee
        or app.selected_package_monthly_fee
        or app.package_payment_amount
        or 0
    )

    amount = float(amount or 0)

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Montant de paiement invalide ou absent sur le package du dossier."
        )

    currency = app.selected_package_currency or app.package_payment_currency or "XAF"

    payment = PaymentTransaction(
        payment_reference="PAY-" + uuid.uuid4().hex[:12].upper(),
        application_id=app.id,
        application_reference=app.reference,
        client_email=app.email,
        package_code=app.selected_package_code or "PACKAGE",
        package_name=app.selected_package_name or "Package ouverture de compte",
        amount=amount,
        currency=currency,
        provider="MASTERCARD",
        status="PENDING",
    )

    db.add(payment)
    db.flush()

    app.package_payment_reference = payment.payment_reference
    app.package_payment_status = "PENDING"
    app.package_payment_provider = "MASTERCARD"
    app.package_payment_amount = amount
    app.package_payment_currency = currency
    app.status = "APPROVED_PENDING_PAYMENT"

    return payment


@router.post("/generate")
def generate_client_payment_link(payload: ClientPaymentLinkRequest):
    db = SessionLocal()

    try:
        reference = payload.application_reference.strip()

        app = (
            db.query(AccountApplication)
            .filter(AccountApplication.reference == reference)
            .first()
        )

        if not app:
            raise HTTPException(status_code=404, detail="Dossier introuvable.")

        if not _identifier_matches(app, payload.identifier):
            raise HTTPException(
                status_code=403,
                detail="Vérification échouée. L'email ou le téléphone ne correspond pas au dossier."
            )

        can_generate, message = _can_generate_payment_link(app)

        if not can_generate:
            return {
                "success": False,
                "status": "NOT_ELIGIBLE",
                "message": message,
                "application_reference": app.reference,
                "application_status": app.status,
                "package_payment_status": app.package_payment_status,
            }

        payment = _find_existing_payment(db, app)

        if _is_payment_already_confirmed(app, payment):
            return {
                "success": True,
                "status": "PAYMENT_ALREADY_CONFIRMED",
                "message": "Le paiement est déjà confirmé pour ce dossier.",
                "application_reference": app.reference,
                "application_status": app.status,
                "package_payment_status": app.package_payment_status,
            }

        if not payment:
            payment = _create_payment_record(db, app)

        session_result = None

        if not payment.provider_transaction_id or not payment.payment_url:
            session_result = create_mastercard_payment_session(payment)

            if session_result.get("provider_transaction_id"):
                payment.provider_transaction_id = session_result.get("provider_transaction_id")

            if session_result.get("payment_url"):
                payment.payment_url = session_result.get("payment_url")

            payment.raw_response = json.dumps(session_result, ensure_ascii=False, default=str)

        if not payment.payment_url:
            db.commit()

            return {
                "success": False,
                "status": "PAYMENT_LINK_NOT_CREATED",
                "message": "Le lien de paiement n'a pas pu être créé. Veuillez contacter la banque.",
                "application_reference": app.reference,
                "payment_reference": payment.payment_reference,
                "session_result": session_result,
            }

        app.package_payment_reference = payment.payment_reference
        app.package_payment_status = payment.status
        app.package_payment_provider = payment.provider
        app.package_payment_amount = payment.amount
        app.package_payment_currency = payment.currency
        app.package_payment_url = payment.payment_url
        app.status = "APPROVED_PENDING_PAYMENT"

        db.commit()
        db.refresh(app)
        db.refresh(payment)

        full_payment_url = _absolute_payment_url(payment.payment_url)

        whatsapp_result = None

        if payload.send_whatsapp:
            whatsapp_result = send_whatsapp_notification(
                phone=app.phone,
                event_type="LIEN_PAIEMENT",
                context={
                    "full_name": f"{app.first_name or ''} {app.last_name or ''}".strip(),
                    "reference": app.reference,
                    "package_name": payment.package_name or app.selected_package_name,
                    "amount": payment.amount,
                    "currency": payment.currency,
                    "payment_url": full_payment_url,
                },
                dry_run=False
            )

        return {
            "success": True,
            "status": "PAYMENT_LINK_READY",
            "message": "Lien de paiement disponible.",
            "application": {
                "reference": app.reference,
                "client": f"{app.first_name or ''} {app.last_name or ''}".strip(),
                "status": app.status,
                "package_payment_status": app.package_payment_status,
            },
            "payment": {
                "payment_reference": payment.payment_reference,
                "amount": payment.amount,
                "currency": payment.currency,
                "status": payment.status,
                "provider": payment.provider,
                "session_mastercard": payment.provider_transaction_id,
                "payment_url": payment.payment_url,
                "full_payment_url": full_payment_url,
            },
            "whatsapp": whatsapp_result,
        }

    finally:
        db.close()
