from fastapi import APIRouter, Query
from app.database import SessionLocal
from app.models import AccountApplication, PaymentTransaction
from app.services.mastercard_gateway_service import public_config_status, retrieve_order
from app.services.callbell_delivery_status_service import list_callbell_messages

router = APIRouter(
    prefix="/api/backoffice/diagnostics",
    tags=["Backoffice Diagnostics"],
)


def _absolute_url(path_or_url: str | None) -> str | None:
    if not path_or_url:
        return None

    value = str(path_or_url).strip()

    if value.startswith("http://") or value.startswith("https://"):
        return value

    cfg = public_config_status()
    base = (
        cfg.get("merchant_url")
        or "https://diaspora-onboarding.com"
    ).rstrip("/")

    if not value.startswith("/"):
        value = "/" + value

    return base + value


def _summarize_mastercard_order(order_result):
    if not order_result:
        return None

    gateway = order_result.get("gateway_response") or {}
    response = gateway.get("response") or {}

    tx_list = response.get("transaction") or []
    last_tx = tx_list[-1] if tx_list else {}

    last_response = last_tx.get("response") or {}
    last_transaction = last_tx.get("transaction") or {}

    total_captured = float(response.get("totalCapturedAmount") or 0)
    total_authorized = float(response.get("totalAuthorizedAmount") or 0)
    status = response.get("status")
    auth_status = response.get("authenticationStatus")

    if total_captured > 0 or status == "CAPTURED":
        decision = "PAID_CAPTURED"
        message = "Paiement capturé par Mastercard."
    elif status == "AUTHENTICATED" and total_captured == 0:
        decision = "AUTHENTICATED_NOT_CAPTURED"
        message = "Carte authentifiée, mais aucun montant capturé. Ne pas confirmer le paiement."
    elif status:
        decision = "NOT_PAID"
        message = "Paiement non confirmé par Mastercard."
    else:
        decision = "UNKNOWN"
        message = "Statut Mastercard non déterminé."

    return {
        "success": order_result.get("success"),
        "http_status": gateway.get("http_status"),
        "order_id": response.get("id"),
        "result": response.get("result"),
        "status": status,
        "authenticationStatus": auth_status,
        "totalAuthorizedAmount": total_authorized,
        "totalCapturedAmount": total_captured,
        "last_transaction_type": last_transaction.get("type"),
        "last_transaction_id": last_transaction.get("id"),
        "gatewayCode": last_response.get("gatewayCode"),
        "gatewayRecommendation": last_response.get("gatewayRecommendation"),
        "decision": decision,
        "message": message,
    }


@router.get("/payment/{application_reference}")
def payment_diagnostics(
    application_reference: str,
    refresh_mastercard: bool = Query(False),
    refresh_callbell: bool = Query(True),
):
    db = SessionLocal()

    try:
        app = (
            db.query(AccountApplication)
            .filter(AccountApplication.reference == application_reference)
            .first()
        )

        if not app:
            return {
                "found": False,
                "application_reference": application_reference,
                "message": "Dossier introuvable.",
            }

        payment = None

        if app.package_payment_reference:
            payment = (
                db.query(PaymentTransaction)
                .filter(PaymentTransaction.payment_reference == app.package_payment_reference)
                .first()
            )

        if not payment:
            payment = (
                db.query(PaymentTransaction)
                .filter(PaymentTransaction.application_reference == app.reference)
                .order_by(PaymentTransaction.created_at.desc())
                .first()
            )

        payment_link = None
        mastercard_summary = None

        if payment:
            payment_link = _absolute_url(payment.payment_url or app.package_payment_url)

            if refresh_mastercard and payment.payment_reference:
                order_result = retrieve_order(payment.payment_reference, dry_run=False)
                mastercard_summary = _summarize_mastercard_order(order_result)

        whatsapp_messages = list_callbell_messages(
            reference=app.reference,
            limit=10,
            refresh=refresh_callbell,
        )

        last_whatsapp = whatsapp_messages[-1] if whatsapp_messages else None

        return {
            "found": True,
            "application": {
                "reference": app.reference,
                "client": f"{app.first_name or ''} {app.last_name or ''}".strip(),
                "phone": app.phone,
                "status": app.status,
                "review_decision": app.review_decision,
                "package_payment_status": app.package_payment_status,
                "package_payment_reference": app.package_payment_reference,
            },
            "payment": None if not payment else {
                "payment_reference": payment.payment_reference,
                "amount": payment.amount,
                "currency": payment.currency,
                "provider": payment.provider,
                "provider_transaction_id": payment.provider_transaction_id,
                "status": payment.status,
                "payment_url": payment.payment_url,
                "payment_link": payment_link,
                "paid_at": payment.paid_at,
                "failed_at": payment.failed_at,
            },
            "mastercard": mastercard_summary,
            "whatsapp": {
                "last": last_whatsapp,
                "messages": whatsapp_messages,
            },
            "actions": {
                "can_copy_payment_link": bool(payment_link),
                "copy_payment_link": payment_link,
            },
        }

    finally:
        db.close()
