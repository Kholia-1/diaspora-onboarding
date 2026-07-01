import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountApplication, PaymentTransaction
from app.services.mastercard_payment_service import (
    build_payment_reference,
    calculate_package_amount,
    create_mastercard_payment_session,
)
from app.services.whatsapp_notification_service import send_whatsapp_notification


router = APIRouter(
    prefix="/api/payments",
    tags=["Paiements packages"]
)


def payment_payload(payment: PaymentTransaction):
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


def is_payment_allowed_after_approval(application) -> bool:
    status = str(getattr(application, "status", "") or "").upper()
    review_decision = str(getattr(application, "review_decision", "") or "").upper()

    allowed_statuses = {
        "APPROVED",
        "APPROVED_PENDING_PAYMENT",
        "PAYMENT_PENDING",
        "PAYMENT_CONFIRMED"
    }

    allowed_decisions = {
        "APPROVED",
        "VALIDATED",
        "ACCEPTED",
        "ACCOUNT_APPROVED",
        "COMPTE_APPROUVE"
    }

    return status in allowed_statuses or review_decision in allowed_decisions


def sync_payment_to_application(application, payment: PaymentTransaction):
    if not application:
        return

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
    if not application:
        return "Cher client"

    first_name = str(getattr(application, "first_name", "") or "").strip()
    last_name = str(getattr(application, "last_name", "") or "").strip()
    full_name = f"{first_name} {last_name}".strip()

    return full_name or "Cher client"


def application_phone(application):
    if not application:
        return ""

    return (
        getattr(application, "phone", None)
        or getattr(application, "phone_number", None)
        or getattr(application, "whatsapp_phone", None)
        or ""
    )


def notify_payment_confirmed_whatsapp(application, payment: PaymentTransaction):
    phone = application_phone(application)

    context = {
        "full_name": application_full_name(application),
        "reference": payment.application_reference,
        "application_reference": payment.application_reference,
        "payment_reference": payment.payment_reference,
        "package_name": payment.package_name,
        "amount": payment.amount,
        "currency": payment.currency,
    }

    return send_whatsapp_notification(
        phone=phone,
        event_type="PAIEMENT_CONFIRME",
        context=context,
        dry_run=True
    )


@router.post("/package/initiate/{application_reference}")
def initiate_package_payment(application_reference: str, db: Session = Depends(get_db)):
    application = db.query(AccountApplication).filter(
        AccountApplication.reference == application_reference
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")

    if not is_payment_allowed_after_approval(application):
        raise HTTPException(
            status_code=403,
            detail="Le paiement sera disponible après validation du dossier par la banque."
        )

    amount = calculate_package_amount(application)

    payment_required = (
        bool(getattr(application, "selected_package_payment_required", False))
        or amount > 0
    )

    if payment_required and hasattr(application, "selected_package_payment_required"):
        application.selected_package_payment_required = True

    if not payment_required:
        return {
            "message": "Aucun paiement requis pour ce package.",
            "payment_required": False,
            "application_reference": application.reference,
            "package_code": getattr(application, "selected_package_code", None),
            "package_name": getattr(application, "selected_package_name", None),
        }

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Le package est marqué comme payant, mais le montant à payer est nul."
        )

    existing = db.query(PaymentTransaction).filter(
        PaymentTransaction.application_reference == application.reference,
        PaymentTransaction.package_code == getattr(application, "selected_package_code", None),
        PaymentTransaction.status == "PENDING"
    ).first()

    if existing:
        sync_payment_to_application(application, existing)
        db.commit()

        return {
            "message": "Paiement déjà initié.",
            "payment_required": True,
            "payment": payment_payload(existing)
        }

    payment = PaymentTransaction(
        payment_reference=build_payment_reference(),
        application_id=application.id,
        application_reference=application.reference,
        client_email=application.email,
        package_code=getattr(application, "selected_package_code", None),
        package_name=getattr(application, "selected_package_name", None),
        amount=amount,
        currency=getattr(application, "selected_package_currency", None) or "XAF",
        provider="MASTERCARD",
        provider_item_code=getattr(application, "selected_package_code", None),
        status="PENDING",
    )

    db.add(payment)
    db.flush()

    session = create_mastercard_payment_session(payment)

    payment.provider_transaction_id = session["provider_transaction_id"]
    payment.payment_url = session["payment_url"]
    payment.raw_response = json.dumps(session["raw_response"], ensure_ascii=False)

    sync_payment_to_application(application, payment)

    if hasattr(application, "package_payment_status"):
        application.package_payment_status = "PENDING"

    if getattr(application, "status", None) == "APPROVED":
        application.status = "APPROVED_PENDING_PAYMENT"

    db.commit()
    db.refresh(payment)

    return {
        "message": "Paiement package initié.",
        "payment_required": True,
        "payment": payment_payload(payment)
    }


@router.get("/{payment_reference}")
def get_payment_status(payment_reference: str, db: Session = Depends(get_db)):
    payment = db.query(PaymentTransaction).filter(
        PaymentTransaction.payment_reference == payment_reference
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")

    return payment_payload(payment)


@router.post("/{payment_reference}/simulate-success")
def simulate_payment_success(payment_reference: str, db: Session = Depends(get_db)):
    payment = db.query(PaymentTransaction).filter(
        PaymentTransaction.payment_reference == payment_reference
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")

    payment.status = "PAID"
    payment.paid_at = datetime.utcnow()

    application = db.query(AccountApplication).filter(
        AccountApplication.reference == payment.application_reference
    ).first()

    if application:
        application.status = "PAYMENT_CONFIRMED"
        sync_payment_to_application(application, payment)

    whatsapp_notification = notify_payment_confirmed_whatsapp(application, payment)

    db.commit()
    db.refresh(payment)

    return {
        "message": "Paiement simulé comme confirmé.",
        "payment": payment_payload(payment),
        "whatsapp_notification": whatsapp_notification
    }


@router.post("/{payment_reference}/simulate-failure")
def simulate_payment_failure(payment_reference: str, db: Session = Depends(get_db)):
    payment = db.query(PaymentTransaction).filter(
        PaymentTransaction.payment_reference == payment_reference
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")

    payment.status = "FAILED"
    payment.failed_at = datetime.utcnow()

    application = db.query(AccountApplication).filter(
        AccountApplication.reference == payment.application_reference
    ).first()

    if application:
        sync_payment_to_application(application, payment)

    db.commit()
    db.refresh(payment)

    return {
        "message": "Paiement simulé comme échoué.",
        "payment": payment_payload(payment)
    }


@router.get("/{payment_reference}/simulate-success", response_class=HTMLResponse)
def simulate_payment_success_get(payment_reference: str, db: Session = Depends(get_db)):
    payment = db.query(PaymentTransaction).filter(
        PaymentTransaction.payment_reference == payment_reference
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")

    payment.status = "PAID"
    payment.paid_at = datetime.utcnow()

    application = db.query(AccountApplication).filter(
        AccountApplication.reference == payment.application_reference
    ).first()

    if application:
        application.status = "PAYMENT_CONFIRMED"
        sync_payment_to_application(application, payment)

    whatsapp_notification = notify_payment_confirmed_whatsapp(application, payment)

    db.commit()
    db.refresh(payment)

    prepared_message = whatsapp_notification.get("prepared_message") if isinstance(whatsapp_notification, dict) else ""

    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Paiement confirmé</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: #F4F6F9;
                margin: 0;
                padding: 40px;
            }}
            .card {{
                max-width: 720px;
                margin: auto;
                background: white;
                border-radius: 18px;
                padding: 28px;
                box-shadow: 0 12px 30px rgba(0,0,0,.08);
                border-top: 6px solid #16A34A;
            }}
            h1 {{
                color: #166534;
                margin-top: 0;
            }}
            .notice {{
                background: #EFF6FF;
                border: 1px solid #BFDBFE;
                color: #1E3A8A;
                border-radius: 12px;
                padding: 14px;
                margin-top: 16px;
                line-height: 1.5;
            }}
            .btn {{
                display: inline-block;
                margin-top: 14px;
                padding: 12px 16px;
                background: #C90000;
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
            }}
            .btn-dark {{
                background: #111827;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Paiement confirmé</h1>
            <p><strong>Référence paiement :</strong> {payment.payment_reference}</p>
            <p><strong>Dossier :</strong> {payment.application_reference}</p>
            <p><strong>Package :</strong> {payment.package_name or payment.package_code}</p>
            <p><strong>Montant :</strong> {payment.amount} {payment.currency}</p>
            <p><strong>Statut :</strong> {payment.status}</p>

            <div class="notice">
                <strong>Simulation WhatsApp :</strong><br>
                {prepared_message or "Notification WhatsApp préparée en simulation."}
            </div>

            <a class="btn" href="/client/status">Retour au suivi client</a>
            <a class="btn btn-dark" href="/api/payments/{payment.payment_reference}">Voir statut JSON</a>
        </div>
    </body>
    </html>
    """


@router.get("/{payment_reference}/simulate-page", response_class=HTMLResponse)
def simulate_payment_page(payment_reference: str, db: Session = Depends(get_db)):
    payment = db.query(PaymentTransaction).filter(
        PaymentTransaction.payment_reference == payment_reference
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")

    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Paiement Mastercard simulé</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: #F4F6F9;
                margin: 0;
                padding: 40px;
            }}
            .card {{
                max-width: 620px;
                margin: auto;
                background: white;
                border-radius: 18px;
                padding: 28px;
                box-shadow: 0 12px 30px rgba(0,0,0,.08);
                border-top: 6px solid #C90000;
            }}
            h1 {{
                color: #C90000;
                margin-top: 0;
            }}
            .btn {{
                display: inline-block;
                margin-top: 14px;
                padding: 12px 16px;
                background: #C90000;
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
            }}
            .btn-dark {{
                background: #111827;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Paiement Mastercard simulé</h1>
            <p><strong>Référence paiement :</strong> {payment.payment_reference}</p>
            <p><strong>Dossier :</strong> {payment.application_reference}</p>
            <p><strong>Package :</strong> {payment.package_name or payment.package_code}</p>
            <p><strong>Montant :</strong> {payment.amount} {payment.currency}</p>
            <p><strong>Statut :</strong> {payment.status}</p>

            <a class="btn" href="/api/payments/{payment.payment_reference}/simulate-success">
                Simuler paiement réussi
            </a>

            <a class="btn btn-dark" href="/api/payments/{payment.payment_reference}">
                Voir statut JSON
            </a>
        </div>
    </body>
    </html>
    """
