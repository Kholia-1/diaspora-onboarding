import json

from app.models import PaymentTransaction
from app.services.mastercard_payment_service import (
    build_payment_reference,
    calculate_package_amount,
    create_mastercard_payment_session,
)


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


def create_package_payment_after_approval(application, db):
    # Création automatique du paiement package après validation back-office.
    # Le client ne crée pas lui-même le paiement.

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

    existing = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.application_reference == application.reference)
        .filter(PaymentTransaction.package_code == package_code)
        .filter(PaymentTransaction.status.in_(["PENDING", "PAID"]))
        .order_by(PaymentTransaction.id.desc())
        .first()
    )

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

    return {
        "payment_required": True,
        "message": "Paiement package créé automatiquement après approbation.",
        "payment": payment_to_payload(payment)
    }
