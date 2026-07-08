import json
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
    prefix="/api/backoffice/payment-link",
    tags=["Backoffice Payment Link"],
)


class GeneratePaymentLinkPayload(BaseModel):
    amount_override: Optional[float] = None
    send_whatsapp: Optional[bool] = False


def absolute_url(path_or_url):
    if not path_or_url:
        return None

    value = str(path_or_url).strip()

    if value.startswith("http://") or value.startswith("https://"):
        return value

    config = public_config_status()
    base = (config.get("merchant_url") or "https://diaspora-onboarding.com").rstrip("/")

    if not value.startswith("/"):
        value = "/" + value

    return base + value


def payment_confirmed(app, payment=None):
    app_payment_status = str(getattr(app, "package_payment_status", "") or "").upper()
    app_status = str(getattr(app, "status", "") or "").upper()
    payment_status = str(getattr(payment, "status", "") or "").upper() if payment else ""

    return (
        app_payment_status in {"PAID", "PAYMENT_CONFIRMED", "CAPTURED"}
        or app_status == "PAYMENT_CONFIRMED"
        or payment_status in {"PAID", "PAYMENT_CONFIRMED", "CAPTURED"}
    )


def dossier_eligible_for_payment(app):
    status = str(getattr(app, "status", "") or "").upper()
    decision = str(getattr(app, "review_decision", "") or "").upper()

    return (
        decision in {"APPROVED", "ACCOUNT_APPROVED"}
        or status in {"APPROVED", "APPROVED_PENDING_PAYMENT", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"}
    )


def find_payment(db, app):
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


def resolve_amount(app, amount_override=None):
    values = [
        getattr(app, "package_payment_amount", None),
        getattr(app, "selected_package_opening_fee", None),
        getattr(app, "selected_package_subscription_fee", None),
        getattr(app, "selected_package_monthly_fee", None),
        amount_override,
    ]

    for value in values:
        try:
            amount = float(value or 0)
            if amount > 0:
                return amount
        except Exception:
            pass

    return 0.0


def create_payment(db, app, amount_override=None):
    amount = resolve_amount(app, amount_override)

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Montant de paiement absent. Renseignez le montant du package ou un montant test."
        )

    currency = app.package_payment_currency or app.selected_package_currency or "XAF"

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

    app.selected_package_payment_required = True
    app.package_payment_reference = payment.payment_reference
    app.package_payment_status = "PENDING"
    app.package_payment_provider = "MASTERCARD"
    app.package_payment_amount = amount
    app.package_payment_currency = currency
    app.status = "APPROVED_PENDING_PAYMENT"

    return payment


@router.post("/{application_reference}/generate")
def generate_backoffice_payment_link(
    application_reference: str,
    payload: GeneratePaymentLinkPayload = GeneratePaymentLinkPayload(),
):
    db = SessionLocal()

    try:
        # BACKOFFICE_PAYMENT_LINK_LOOKUP_REFERENCE_OR_ID_V3
        app = (
            db.query(AccountApplication)
            .filter(AccountApplication.reference == application_reference)
            .first()
        )

        if not app and str(application_reference).isdigit():
            app = (
                db.query(AccountApplication)
                .filter(AccountApplication.id == int(application_reference))
                .first()
            )

        if not app:
            raise HTTPException(status_code=404, detail="Dossier introuvable.")

        if not dossier_eligible_for_payment(app):
            raise HTTPException(
                status_code=400,
                detail={
                    "status": "DOSSIER_NOT_APPROVED",
                    "message": "Le dossier doit être approuvé avant génération du lien de paiement.",
                    "application_status": app.status,
                    "review_decision": app.review_decision,
                }
            )

        payment = find_payment(db, app)

        if payment_confirmed(app, payment):
            return {
                "success": True,
                "status": "PAYMENT_ALREADY_CONFIRMED",
                "message": "Le paiement est déjà confirmé pour ce dossier.",
                "application_reference": app.reference,
                "payment_reference": payment.payment_reference if payment else app.package_payment_reference,
            }

        if not payment:
            payment = create_payment(db, app, payload.amount_override)

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
                "message": "La session Mastercard n'a pas pu être créée.",
                "application_reference": app.reference,
                "payment_reference": payment.payment_reference,
                "session_result": session_result,
            }

        app.selected_package_payment_required = True
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

        full_payment_url = absolute_url(payment.payment_url)

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
                dry_run=False,
            )

        return {
            "success": True,
            "status": "PAYMENT_LINK_READY",
            "message": "Lien de paiement disponible.",
            "application": {
                "reference": app.reference,
                "client": f"{app.first_name or ''} {app.last_name or ''}".strip(),
                "phone": app.phone,
                "email": app.email,
                "status": app.status,
                "review_decision": app.review_decision,
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
            "session_result": session_result,
            "whatsapp": whatsapp_result,
        }

    finally:
        db.close()
