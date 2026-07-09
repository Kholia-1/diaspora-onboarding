from pathlib import Path
from datetime import datetime, timezone
import json

from fastapi import APIRouter, Query
from app.database import SessionLocal
from app.models import AccountApplication, PaymentTransaction
from app.services.mastercard_gateway_service import public_config_status, retrieve_order
from app.services.callbell_delivery_status_service import (
    list_callbell_messages,
    get_callbell_message_status,
)

router = APIRouter(
    prefix="/api/backoffice/diagnostics",
    tags=["Backoffice Diagnostics"],
)

OTP_STORE_PATH = Path("data/pre_onboarding_otps.json")


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


def _safe_attr(obj, name: str, default=None):
    return getattr(obj, name, default)


def _normalize_phone_for_match(value: str | None) -> str:
    value = str(value or "").strip()
    value = (
        value.replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if value.startswith("00"):
        value = "+" + value[2:]

    if value.startswith("+"):
        return value

    if value.startswith("237"):
        return "+" + value

    if value.startswith("6") and len(value) == 9:
        return "+237" + value

    return value


def _load_otp_store() -> dict:
    if not OTP_STORE_PATH.exists():
        return {}

    try:
        data = json.loads(OTP_STORE_PATH.read_text(encoding="utf-8") or "{}")
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_otp_store(data: dict):
    OTP_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    OTP_STORE_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _find_otp_record_for_application(app):
    store = _load_otp_store()

    if not store:
        return None, None, store

    session_id = str(_safe_attr(app, "pre_onboarding_session_id", "") or "").strip()

    if session_id and session_id in store:
        return session_id, store.get(session_id), store

    app_email = str(_safe_attr(app, "email", "") or "").strip().lower()
    app_phone = _normalize_phone_for_match(
        _safe_attr(app, "whatsapp_phone_full", None)
        or _safe_attr(app, "phone", None)
    )

    for sid, record in store.items():
        if not isinstance(record, dict):
            continue

        rec_email = str(record.get("email") or "").strip().lower()
        rec_phone = _normalize_phone_for_match(record.get("phone"))

        if app_email and rec_email and app_email == rec_email:
            return sid, record, store

        if app_phone and rec_phone and app_phone == rec_phone:
            return sid, record, store

    return None, None, store


def _refresh_otp_live_status(session_id: str | None, record: dict | None, store: dict):
    if not session_id or not record:
        return None

    uuid = record.get("callbell_message_uuid")

    if not uuid:
        return None

    live = get_callbell_message_status(uuid)

    record["callbell_last_refresh_at"] = datetime.now(timezone.utc).isoformat()
    record["callbell_last_refresh_success"] = bool(live.get("success"))

    if live.get("success"):
        record["callbell_live_status"] = live.get("status")
        record["callbell_live_errors"] = live.get("errors") or []

        if live.get("status"):
            record["whatsapp_delivery_status"] = str(live.get("status")).upper()
    else:
        record["callbell_live_status"] = live.get("status") or "ERROR"
        record["callbell_live_errors"] = live.get("errors") or []
        record["callbell_live_error"] = live.get("error") or live.get("response")

    store[session_id] = record
    _save_otp_store(store)

    return live


def _upper(value):
    return str(value or "").strip().upper()


def _collect_errors(*sources):
    errors = []

    for source in sources:
        if not source:
            continue

        if isinstance(source, list):
            for item in source:
                if item:
                    errors.append(item)

        if isinstance(source, dict):
            for key in ["errors", "callbell_live_errors"]:
                val = source.get(key)
                if isinstance(val, list):
                    errors.extend([x for x in val if x])

            live = source.get("live_status") or source.get("live")
            if isinstance(live, dict):
                val = live.get("errors")
                if isinstance(val, list):
                    errors.extend([x for x in val if x])

    return errors


def _error_admin_message(errors):
    if not errors:
        return ""

    first = errors[0] or {}

    code = first.get("code")
    title = first.get("title")
    message = first.get("message")
    details = first.get("details")

    parts = []

    if code:
        parts.append(f"Meta/Callbell {code}")

    if title:
        parts.append(str(title))

    if message:
        parts.append(str(message))

    if details:
        parts.append(str(details))

    return " — ".join(parts)


def _build_whatsapp_summary(otp_record: dict | None, last_message: dict | None, live_result: dict | None):
    otp_record = otp_record or {}
    last_message = last_message or {}
    live_result = live_result or {}

    initial_status = _upper(
        otp_record.get("callbell_message_status")
        or otp_record.get("whatsapp_delivery_status")
        or last_message.get("initial_status")
    )

    live_status = _upper(
        otp_record.get("callbell_live_status")
        or live_result.get("status")
        or ((last_message.get("live_status") or {}).get("status") if isinstance(last_message.get("live_status"), dict) else None)
    )

    delivery_status = _upper(
        live_status
        or otp_record.get("whatsapp_delivery_status")
        or last_message.get("delivery_status")
        or initial_status
        or "UNKNOWN"
    )

    errors = _collect_errors(
        otp_record.get("callbell_live_errors"),
        last_message,
        live_result,
    )

    if delivery_status in {"FAILED", "HTTP_ERROR", "ERROR", "CALLBELL_HTTP_ERROR", "CALLBELL_ERROR", "CONFIG_MISSING", "CONFIG_INCOMPLETE", "CONFIGURATION_INCOMPLETE"}:
        severity = "danger"
        label = "Échec WhatsApp / Callbell"
    elif delivery_status in {"DELIVERED", "READ", "SENT"}:
        severity = "success"
        label = "WhatsApp livré ou envoyé"
    elif delivery_status in {"ENQUEUED", "PENDING", "ACCEPTED_BY_CALLBELL", "UNKNOWN"}:
        severity = "warning"
        label = "Livraison WhatsApp non confirmée"
    else:
        severity = "info"
        label = "Statut WhatsApp à vérifier"

    admin_message = _error_admin_message(errors)

    if not admin_message:
        if delivery_status == "ENQUEUED":
            admin_message = "Le message a été accepté par Callbell, mais la livraison WhatsApp n’est pas encore confirmée."
        elif delivery_status == "UNKNOWN":
            admin_message = "Aucune information Callbell exploitable n’a encore été trouvée pour ce dossier."
        elif severity == "success":
            admin_message = "Aucune erreur Callbell détectée."
        else:
            admin_message = f"Statut Callbell actuel : {delivery_status}"

    return {
        "status": delivery_status,
        "initial_status": initial_status or None,
        "live_status": live_status or None,
        "severity": severity,
        "label": label,
        "admin_message": admin_message,
        "client_message": "Le service de vérification WhatsApp est momentanément indisponible. Veuillez réessayer plus tard." if severity == "danger" else "",
        "errors": errors,
        "can_refresh": bool(
            otp_record.get("callbell_message_uuid")
            or last_message.get("uuid")
        ),
    }


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
    refresh_callbell: bool = Query(False),
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

        if _safe_attr(app, "package_payment_reference", None):
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
            payment_link = _absolute_url(payment.payment_url or _safe_attr(app, "package_payment_url", None))

            if refresh_mastercard and payment.payment_reference:
                order_result = retrieve_order(payment.payment_reference, dry_run=False)
                mastercard_summary = _summarize_mastercard_order(order_result)

        otp_session_id, otp_record, otp_store = _find_otp_record_for_application(app)

        otp_live_result = None
        if refresh_callbell and otp_record:
            otp_live_result = _refresh_otp_live_status(otp_session_id, otp_record, otp_store)

        whatsapp_messages = list_callbell_messages(
            reference=app.reference,
            limit=5,
            refresh=refresh_callbell,
        )

        last_whatsapp = whatsapp_messages[-1] if whatsapp_messages else None

        whatsapp_summary = _build_whatsapp_summary(
            otp_record=otp_record,
            last_message=last_whatsapp,
            live_result=otp_live_result,
        )

        return {
            "found": True,
            "application": {
                "id": _safe_attr(app, "id", None),
                "reference": app.reference,
                "client": f"{_safe_attr(app, 'first_name', '') or ''} {_safe_attr(app, 'last_name', '') or ''}".strip(),
                "first_name": _safe_attr(app, "first_name", None),
                "last_name": _safe_attr(app, "last_name", None),
                "email": _safe_attr(app, "email", None),
                "phone": _safe_attr(app, "phone", None),
                "whatsapp_phone_full": _safe_attr(app, "whatsapp_phone_full", None),
                "pre_onboarding_session_id": _safe_attr(app, "pre_onboarding_session_id", None),
                "whatsapp_otp_verified": bool(_safe_attr(app, "whatsapp_otp_verified", False)),
                "whatsapp_otp_verified_at": _safe_attr(app, "whatsapp_otp_verified_at", None),
                "status": _safe_attr(app, "status", None),
                "review_decision": _safe_attr(app, "review_decision", None),
                "package_payment_status": _safe_attr(app, "package_payment_status", None),
                "package_payment_reference": _safe_attr(app, "package_payment_reference", None),
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
                "summary": whatsapp_summary,
                "otp": None if not otp_record else {
                    "session_id": otp_session_id,
                    "phone": otp_record.get("phone"),
                    "email": otp_record.get("email"),
                    "verified": otp_record.get("verified"),
                    "verified_at": otp_record.get("verified_at"),
                    "whatsapp_sent": otp_record.get("whatsapp_sent"),
                    "whatsapp_delivery_status": otp_record.get("whatsapp_delivery_status"),
                    "whatsapp_http_status": otp_record.get("whatsapp_http_status"),
                    "callbell_message_uuid": otp_record.get("callbell_message_uuid"),
                    "callbell_message_status": otp_record.get("callbell_message_status"),
                    "callbell_live_status": otp_record.get("callbell_live_status"),
                    "callbell_live_errors": otp_record.get("callbell_live_errors") or [],
                    "callbell_last_refresh_at": otp_record.get("callbell_last_refresh_at"),
                },
                "last": last_whatsapp,
                "messages": whatsapp_messages,
            },
            "actions": {
                "can_copy_payment_link": bool(payment_link),
                "copy_payment_link": payment_link,
                "can_refresh_callbell": bool(
                    (otp_record or {}).get("callbell_message_uuid")
                    or (last_whatsapp or {}).get("uuid")
                ),
            },
        }

    finally:
        db.close()
