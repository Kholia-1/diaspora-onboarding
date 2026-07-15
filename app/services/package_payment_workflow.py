import json

from app.models import PaymentTransaction
from app.services.mastercard_payment_service import (
    build_payment_reference,
    calculate_package_amount,
    create_mastercard_payment_session,
)
from app.services.public_url import public_base_url
from app.services.whatsapp_notification_service import send_whatsapp_notification


def payment_to_payload(payment: PaymentTransaction):
    return {
        "payment_reference": payment.payment_reference,
        "application_reference": payment.application_reference,
        "client_email": payment.client_email,
        "package_code": payment.package_code,
        "package_name": payment.package_name,
        "amount": payment.amount,
        "currency": payment.currency,
        "provider": payment.provider,
        "provider_transaction_id": payment.provider_transaction_id,
        "status": payment.status,
        "payment_url": payment.payment_url,
        "created_at": payment.created_at,
        "paid_at": payment.paid_at,
        "failed_at": payment.failed_at,
    }


def is_package_payment_required(application) -> bool:
    amount = calculate_package_amount(application)

    return (
        bool(getattr(application, "selected_package_payment_required", False))
        or amount > 0
    )


def sync_payment_to_application(application, payment: PaymentTransaction):
    if hasattr(application, "package_payment_reference"):
        application.package_payment_reference = payment.payment_reference

    if hasattr(application, "package_payment_status"):
        application.package_payment_status = payment.status

    if hasattr(application, "package_payment_provider"):
        application.package_payment_provider = payment.provider

    if hasattr(application, "package_payment_amount"):
        application.package_payment_amount = payment.amount

    if hasattr(application, "package_payment_currency"):
        application.package_payment_currency = payment.currency

    if hasattr(application, "package_payment_url"):
        application.package_payment_url = payment.payment_url


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


def absolute_payment_url(payment_url: str):
    if not payment_url:
        return ""

    if payment_url.startswith("http://") or payment_url.startswith("https://"):
        return payment_url

    return public_base_url() + "/" + payment_url.lstrip("/")


def notify_payment_link_whatsapp(application, payment: PaymentTransaction):
    phone = application_phone(application)

    context = {
        "full_name": application_full_name(application),
        "reference": application.reference,
        "application_reference": application.reference,
        "payment_reference": payment.payment_reference,
        "payment_url": absolute_payment_url(payment.payment_url),
        "package_name": payment.package_name,
        "amount": payment.amount,
        "currency": payment.currency,
    }

    # BLOCK_WHATSAPP_IF_PAYMENT_URL_EMPTY_V1
    payment_url = str(context.get("payment_url") or "").strip()

    if not payment_url:
        return {
            "provider": "CALLBELL",
            "channel": "WHATSAPP",
            "status": "SKIPPED_EMPTY_PAYMENT_URL",
            "sent": False,
            "message": "Notification WhatsApp non envoyée : lien de paiement Mastercard absent.",
            "missing": ["payment_url"]
        }

    return send_whatsapp_notification(
        phone=phone,
        event_type="LIEN_PAIEMENT",
        context=context,
        dry_run=None
    )


def find_existing_payment(application, package_code, db):
    existing = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.application_reference == application.reference)
        .filter(PaymentTransaction.package_code == package_code)
        .order_by(PaymentTransaction.id.desc())
        .first()
    )

    if existing and existing.status in ["PENDING", "PAID"]:
        return existing

    return None


def create_package_payment_after_approval(application, db):
    """
    Création automatique du paiement package après validation back-office.
    Le client ne crée pas lui-même le paiement.
    """

    if not is_package_payment_required(application):
        if hasattr(application, "package_payment_status"):
            application.package_payment_status = "NOT_REQUIRED"

        return {
            "payment_required": False,
            "message": "Aucun paiement requis pour ce package."
        }

    amount = calculate_package_amount(application)

    if amount <= 0:
        if hasattr(application, "package_payment_status"):
            application.package_payment_status = "NOT_REQUIRED"

        return {
            "payment_required": False,
            "message": "Package marqué payant mais montant nul."
        }

    package_code = getattr(application, "selected_package_code", None)

    existing = find_existing_payment(application, package_code, db)

    if existing:
        sync_payment_to_application(application, existing)

        if existing.status == "PENDING":
            application.status = "APPROVED_PENDING_PAYMENT"

        if existing.status == "PAID":
            application.status = "PAYMENT_CONFIRMED"

        return {
            "payment_required": True,
            "message": "Paiement déjà existant.",
            "payment": payment_to_payload(existing)
        }

    payment = PaymentTransaction(
        payment_reference=build_payment_reference(),
        application_id=application.id,
        application_reference=application.reference,
        client_email=application.email,
        package_code=package_code,
        package_name=getattr(application, "selected_package_name", None),
        amount=amount,
        currency=getattr(application, "selected_package_currency", None) or "XAF",
        provider="MASTERCARD",
        provider_item_code=package_code,
        status="PENDING",
    )

    db.add(payment)
    db.flush()

    session = create_mastercard_payment_session(payment)

    payment.provider_transaction_id = session["provider_transaction_id"]
    payment.payment_url = session["payment_url"]
    payment.raw_response = json.dumps(session["raw_response"], ensure_ascii=False)

    sync_payment_to_application(application, payment)

    application.status = "APPROVED_PENDING_PAYMENT"

    whatsapp_notification = notify_payment_link_whatsapp(application, payment)

    return {
        "payment_required": True,
        "message": "Paiement package créé automatiquement après approbation.",
        "payment": payment_to_payload(payment),
        "whatsapp_notification": whatsapp_notification
    }
