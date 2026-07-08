from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
import json


DATA_DIR = Path("data")
SESSIONS_FILE = DATA_DIR / "mastercard_checkout_sessions.jsonl"


def build_payment_reference() -> str:
    return "PAY-" + uuid4().hex[:12].upper()


def calculate_package_amount(application) -> float:
    """
    Montant à payer pour le package.
    Pour la souscription initiale, on additionne :
    - frais d'ouverture
    - frais de souscription

    Les frais mensuels sont conservés comme information tarifaire,
    mais ne sont pas encaissés immédiatement ici.
    """

    opening_fee = float(getattr(application, "selected_package_opening_fee", 0) or 0)
    subscription_fee = float(getattr(application, "selected_package_subscription_fee", 0) or 0)

    return opening_fee + subscription_fee


def _append_jsonl(path: Path, record: dict):
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def create_mastercard_payment_session(payment):
    """
    Création d'une vraie session Mastercard MPGS Hosted Checkout
    pour un paiement package lié à un dossier client.
    """

    from app.services.mastercard_gateway_service import initiate_checkout_session

    amount = float(getattr(payment, "amount", 0) or 0)
    currency = str(getattr(payment, "currency", None) or "XAF")
    order_id = str(getattr(payment, "payment_reference", None) or build_payment_reference())

    description = (
        f"Paiement package ouverture de compte diaspora - "
        f"{getattr(payment, 'application_reference', '') or order_id}"
    )

    result = initiate_checkout_session(
        order_id=order_id,
        amount=amount,
        currency=currency,
        description=description,
        dry_run=False,
    )

    gateway_response = result.get("gateway_response") or {}
    response = gateway_response.get("response") or {}

    session = response.get("session") or {}
    session_id = session.get("id")
    session_version = session.get("version")
    success_indicator = response.get("successIndicator")

    if not gateway_response.get("success") or not session_id or not success_indicator:
        return {
            "provider": "MASTERCARD",
            "provider_transaction_id": None,
            "payment_url": None,
            "raw_response": {
                "mode": "REAL_MASTERCARD_HOSTED_CHECKOUT",
                "status": "SESSION_CREATION_FAILED",
                "gateway_result": result,
            }
        }

    stored_session = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "PACKAGE_PAYMENT",
        "order_id": order_id,
        "payment_reference": order_id,
        "application_id": getattr(payment, "application_id", None),
        "application_reference": getattr(payment, "application_reference", None),
        "client_email": getattr(payment, "client_email", None),
        "package_code": getattr(payment, "package_code", None),
        "package_name": getattr(payment, "package_name", None),
        "amount": f"{amount:.2f}",
        "currency": currency,
        "session_id": session_id,
        "session_version": session_version,
        "successIndicator": success_indicator,
        "gateway_result": response.get("result"),
        "merchant": response.get("merchant"),
        "http_status": gateway_response.get("http_status"),
    }

    _append_jsonl(SESSIONS_FILE, stored_session)

    return {
        "provider": "MASTERCARD",
        "provider_transaction_id": session_id,
        "payment_url": f"/api/payments/mastercard/checkout/{order_id}",
        "raw_response": {
            "mode": "REAL_MASTERCARD_HOSTED_CHECKOUT",
            "status": "SESSION_CREATED",
            "order_id": order_id,
            "session_id": session_id,
            "successIndicator": success_indicator,
            "stored_session": stored_session,
        }
    }
