from datetime import datetime, timezone
from pathlib import Path
import json
import html

from fastapi import APIRouter, Request, Body
from fastapi.responses import HTMLResponse, JSONResponse

from app.services.mastercard_gateway_service import (
    initiate_checkout_session,
    retrieve_order,
)

router = APIRouter(
    prefix="/api/payments/mastercard",
    tags=["Mastercard Payments Public"]
)

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

EVENTS_FILE = DATA_DIR / "mastercard_payment_events.jsonl"
SESSIONS_FILE = DATA_DIR / "mastercard_checkout_sessions.jsonl"
PAYMENT_RECORDS_FILE = DATA_DIR / "mastercard_payment_records.jsonl"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def append_jsonl(path: Path, record: dict):
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def append_event(event_type: str, payload: dict):
    """
    Journal technique minimal.
    Ne pas stocker la réponse brute Mastercard ici.
    """
    append_jsonl(EVENTS_FILE, {
        "event_type": event_type,
        "received_at": utc_now(),
        "payload": payload,
    })


def append_session(record: dict):
    append_jsonl(SESSIONS_FILE, record)


def append_payment_record(record: dict):
    append_jsonl(PAYMENT_RECORDS_FILE, record)


def load_payment_records():
    records = []

    if not PAYMENT_RECORDS_FILE.exists():
        return records

    with PAYMENT_RECORDS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                continue

    return records


def payment_record_already_exists(record: dict):
    order_id = str(record.get("order_id") or "")
    result_indicator = str(record.get("resultIndicator") or "")
    receipt = str(record.get("receipt") or "")

    if not order_id and not result_indicator and not receipt:
        return False

    for existing in reversed(load_payment_records()):
        same_order = order_id and str(existing.get("order_id") or "") == order_id
        same_indicator = result_indicator and str(existing.get("resultIndicator") or "") == result_indicator
        same_receipt = receipt and str(existing.get("receipt") or "") == receipt

        if same_order and (same_indicator or same_receipt):
            return True

    return False


def load_sessions():
    sessions = []

    if not SESSIONS_FILE.exists():
        return sessions

    with SESSIONS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                sessions.append(json.loads(line))
            except Exception:
                continue

    return sessions


def find_session_by_success_indicator(result_indicator: str):
    if not result_indicator:
        return None

    for session in reversed(load_sessions()):
        if str(session.get("successIndicator") or "") == str(result_indicator):
            return session

    return None


def safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def find_payment_transaction(transactions):
    if not isinstance(transactions, list):
        return {}

    for tx in reversed(transactions):
        tx_type = ((tx.get("transaction") or {}).get("type") or tx.get("type") or "").upper()
        if tx_type == "PAYMENT":
            return tx

    return transactions[-1] if transactions else {}


def summarize_retrieve_order(verification: dict, matched_session: dict, result_indicator: str):
    """
    Résumé sécurisé de la réponse Retrieve Order.
    On ne conserve pas les tokens 3DS ni la réponse brute complète.
    """
    gateway_response = verification.get("gateway_response") or {}
    response = gateway_response.get("response") or {}

    transactions = response.get("transaction") or []
    payment_tx = find_payment_transaction(transactions)

    tx_response = payment_tx.get("response") or {}
    tx_transaction = payment_tx.get("transaction") or {}
    tx_source = payment_tx.get("sourceOfFunds") or {}
    tx_card = ((tx_source.get("provided") or {}).get("card") or {})

    order_id = response.get("id") or matched_session.get("order_id")
    expected_amount = safe_float(matched_session.get("amount"))
    captured_amount = safe_float(response.get("totalCapturedAmount"))
    authorized_amount = safe_float(response.get("totalAuthorizedAmount"))

    result = response.get("result")
    status = response.get("status")
    currency = response.get("currency") or matched_session.get("currency")

    gateway_code = tx_response.get("gatewayCode")
    gateway_recommendation = tx_response.get("gatewayRecommendation")

    paid = (
        result == "SUCCESS"
        and status == "CAPTURED"
        and gateway_code == "APPROVED"
        and currency == matched_session.get("currency")
        and captured_amount >= expected_amount
        and expected_amount > 0
    )

    return {
        "verified_at": utc_now(),
        "paid": paid,
        "verification_status": "PAYMENT_CONFIRMED" if paid else "PAYMENT_NOT_CONFIRMED",

        "order_id": order_id,
        "session_id": matched_session.get("session_id"),
        "resultIndicator": result_indicator,

        "amount_expected": matched_session.get("amount"),
        "amount_authorized": response.get("totalAuthorizedAmount"),
        "amount_captured": response.get("totalCapturedAmount"),
        "currency": currency,

        "result": result,
        "status": status,
        "authenticationStatus": response.get("authenticationStatus"),

        "gatewayCode": gateway_code,
        "gatewayRecommendation": gateway_recommendation,
        "authorizationCode": tx_transaction.get("authorizationCode"),
        "receipt": tx_transaction.get("receipt"),
        "transaction_id": tx_transaction.get("id"),
        "stan": tx_transaction.get("stan"),

        "card_brand": tx_card.get("brand"),
        "card_scheme": tx_card.get("scheme"),
        "masked_card": tx_card.get("number"),
        "name_on_card": tx_card.get("nameOnCard"),

        "merchant": response.get("merchant"),
        "http_status": gateway_response.get("http_status"),
    }


@router.post("/create-checkout-session")
async def create_checkout_session(payload: dict = Body(default={})):
    """
    Crée une session Hosted Checkout Mastercard et sauvegarde les éléments nécessaires
    à la vérification du paiement au retour.
    """
    amount = payload.get("amount", 500)
    currency = payload.get("currency", "XAF")
    description = payload.get("description", "Paiement package Diaspora")
    order_id = payload.get("order_id")

    dossier_id = payload.get("dossier_id")
    client_reference = payload.get("client_reference")

    result = initiate_checkout_session(
        order_id=order_id,
        amount=amount,
        currency=currency,
        description=description,
        dry_run=False,
    )

    gateway_response = result.get("gateway_response") or {}
    gateway_body = gateway_response.get("response") or {}
    payload_sent = result.get("payload") or {}
    order = payload_sent.get("order") or {}
    session = gateway_body.get("session") or {}

    record = {
        "created_at": utc_now(),
        "order_id": order.get("id") or order_id,
        "amount": order.get("amount") or str(amount),
        "currency": order.get("currency") or currency,
        "description": order.get("description") or description,

        "session_id": session.get("id"),
        "session_version": session.get("version"),
        "successIndicator": gateway_body.get("successIndicator"),

        "gateway_result": gateway_body.get("result"),
        "merchant": gateway_body.get("merchant"),
        "http_status": gateway_response.get("http_status"),

        "dossier_id": dossier_id,
        "client_reference": client_reference,
    }

    append_session(record)

    append_event("mastercard_checkout_session_created", {
        "order_id": record["order_id"],
        "session_id": record["session_id"],
        "amount": record["amount"],
        "currency": record["currency"],
        "gateway_result": record["gateway_result"],
        "http_status": record["http_status"],
        "dossier_id": dossier_id,
        "client_reference": client_reference,
    })

    result["stored_session"] = record
    return JSONResponse(result)


@router.get("/return", response_class=HTMLResponse)
async def mastercard_return(request: Request):
    query_params = dict(request.query_params)

    result_indicator = (
        query_params.get("resultIndicator")
        or query_params.get("result_indicator")
        or query_params.get("result")
        or ""
    )

    matched_session = find_session_by_success_indicator(result_indicator)

    payment_record = None
    verification_status = "NOT_VERIFIED"
    verification_message = "Aucune session sauvegardée ne correspond à ce resultIndicator."

    if matched_session and matched_session.get("order_id"):
        verification = retrieve_order(
            order_id=matched_session["order_id"],
            dry_run=False,
        )

        payment_record = summarize_retrieve_order(
            verification=verification,
            matched_session=matched_session,
            result_indicator=result_indicator,
        )

        if payment_record_already_exists(payment_record):
            append_event("mastercard_payment_record_duplicate_ignored", {
                "order_id": payment_record.get("order_id"),
                "resultIndicator": result_indicator,
                "receipt": payment_record.get("receipt"),
            })
        else:
            append_payment_record(payment_record)

        db_update_result = _mc_mark_package_payment_confirmed(payment_record, matched_session)
        payment_record["database_update"] = db_update_result

        verification_status = payment_record["verification_status"]

        if payment_record["paid"]:
            verification_message = "Paiement confirmé par la plateforme de paiement."
        else:
            verification_message = "Paiement reçu mais non confirmé selon les critères de validation."

        append_event("mastercard_return_verified", {
            "order_id": payment_record.get("order_id"),
            "session_id": payment_record.get("session_id"),
            "resultIndicator": result_indicator,
            "paid": payment_record.get("paid"),
            "verification_status": verification_status,
            "result": payment_record.get("result"),
            "status": payment_record.get("status"),
            "gatewayCode": payment_record.get("gatewayCode"),
            "amount_captured": payment_record.get("amount_captured"),
            "currency": payment_record.get("currency"),
        })
    else:
        append_event("mastercard_return_unmatched", {
            "resultIndicator": result_indicator,
            "query_params": query_params,
        })

    append_event("mastercard_return_get", {
        "url": str(request.url),
        "query_params": query_params,
        "client": request.client.host if request.client else None,
        "matched": bool(matched_session),
        "verification_status": verification_status,
    })

    order_id = matched_session.get("order_id") if matched_session else ""
    session_id = matched_session.get("session_id") if matched_session else ""

    paid = bool(payment_record and payment_record.get("paid"))

    title = "Paiement confirmé" if paid else "Retour paiement reçu"
    title_color = "#16a34a" if paid else "#D22630"

    safe_result_indicator = html.escape(result_indicator or "non fourni")
    safe_order_id = html.escape(order_id or "non retrouvé")
    safe_session_id = html.escape(session_id or "non retrouvée")
    safe_verification_status = html.escape(verification_status)
    safe_verification_message = html.escape(verification_message)

    amount_captured = ""
    if payment_record:
        amount_captured = f'{payment_record.get("amount_captured")} {payment_record.get("currency")}'

    safe_amount_captured = html.escape(amount_captured or "non confirmé")

    html_content = f"""
    <!doctype html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <title>Retour paiement Mastercard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: #f4f6f9;
                margin: 0;
                padding: 40px;
                color: #111827;
            }}
            .card {{
                max-width: 760px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                padding: 28px;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.10);
                border-top: 6px solid {title_color};
            }}
            h1 {{
                margin-top: 0;
                color: {title_color};
            }}
            .ok {{
                background: #ecfdf3;
                border: 1px solid #22c55e;
                padding: 14px;
                border-radius: 10px;
                margin-top: 18px;
            }}
            .warn {{
                background: #fff7df;
                border: 1px solid #facc15;
                padding: 14px;
                border-radius: 10px;
                margin-top: 18px;
            }}
            code {{
                background: #f3f4f6;
                padding: 3px 6px;
                border-radius: 6px;
                word-break: break-word;
                white-space: nowrap;
                display: inline-block;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>{title}</h1>

            <p>Votre retour depuis Mastercard Gateway a bien été reçu par l’application.</p>

            <div class="ok">
                <strong>Demande reçue :</strong> votre paiement a bien été transmis à notre système.
            </div>

            <div class="warn">
                <strong>Confirmation :</strong> {safe_verification_message}
            </div>

            <div class="ok">
                <strong>Montant confirmé :</strong> <code>{safe_amount_captured}</code>
            </div>

            <p>
                Votre paiement a été confirmé avec succès. Votre dossier est en cours de mise à jour.
            </p>

            <p>
                <strong>Référence paiement :</strong>
                <code>{safe_order_id}</code>
            </p>

            <p style="margin-top: 24px;">
                <a href="/client/status?payment_order_id={safe_order_id}"
                   style="display:inline-block;background:#D22630;color:white;text-decoration:none;
                          padding:14px 20px;border-radius:10px;font-weight:700;">
                    Retourner au suivi de ma demande
                </a>
            </p>

            <details style="margin-top: 24px;">
                <summary style="cursor:pointer;color:#6b7280;">Détails techniques</summary>
                <p><strong>Session ID :</strong> <code>{safe_session_id}</code></p>
                <p><strong>Result Indicator :</strong> <code>{safe_result_indicator}</code></p>
                <p><strong>Statut vérification :</strong> <code>{safe_verification_status}</code></p>
            </details>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content, status_code=200)


@router.get("/webhook")
async def mastercard_webhook_healthcheck(request: Request):
    append_event("mastercard_webhook_get_test", {
        "url": str(request.url),
        "query_params": dict(request.query_params),
        "client": request.client.host if request.client else None,
    })

    return JSONResponse({
        "success": True,
        "status": "WEBHOOK_ROUTE_AVAILABLE",
        "message": "Route webhook Mastercard disponible. Utiliser POST pour les notifications réelles."
    })


@router.post("/webhook")
async def mastercard_webhook(request: Request):
    raw_body = await request.body()

    try:
        body = await request.json()
    except Exception:
        body = raw_body.decode("utf-8", errors="replace") if raw_body else None

    append_event("mastercard_webhook_post", {
        "url": str(request.url),
        "content_type": request.headers.get("content-type"),
        "user_agent": request.headers.get("user-agent"),
        "body_type": "json" if isinstance(body, dict) else "raw",
        "client": request.client.host if request.client else None,
    })

    return JSONResponse({
        "success": True,
        "status": "WEBHOOK_RECEIVED",
        "message": "Notification Mastercard reçue."
    })


@router.get("/checkout-test", response_class=HTMLResponse)
async def mastercard_checkout_test_page():
    html_content = """
    <!doctype html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <title>Test Mastercard Hosted Checkout</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <script src="https://na-gateway.mastercard.com/static/checkout/checkout.min.js"
                data-error="errorCallback"
                data-cancel="cancelCallback"></script>

        <style>
            body {
                font-family: Arial, sans-serif;
                background: #f4f6f9;
                margin: 0;
                padding: 40px;
                color: #111827;
            }
            .card {
                max-width: 760px;
                margin: 0 auto;
                background: white;
                border-radius: 18px;
                padding: 28px;
                box-shadow: 0 10px 30px rgba(15, 23, 42, 0.10);
                border-top: 6px solid #D22630;
            }
            h1 {
                margin-top: 0;
                color: #D22630;
            }
            button {
                background: #D22630;
                color: white;
                border: none;
                padding: 14px 22px;
                border-radius: 10px;
                font-weight: 700;
                cursor: pointer;
                font-size: 15px;
            }
            button:disabled {
                opacity: 0.65;
                cursor: not-allowed;
            }
            pre {
                background: #0f172a;
                color: #e5e7eb;
                padding: 16px;
                border-radius: 12px;
                overflow-x: auto;
                margin-top: 20px;
                font-size: 13px;
            }
            .info {
                background: #fff7df;
                border: 1px solid #facc15;
                padding: 14px;
                border-radius: 10px;
                margin: 18px 0;
            }
        </style>

        <script>
            function log(message, data) {
                const box = document.getElementById("log");
                const line = typeof data === "undefined"
                    ? message
                    : message + "\\n" + JSON.stringify(data, null, 2);
                box.textContent = line + "\\n\\n" + box.textContent;
            }

            function errorCallback(error) {
                log("Erreur Mastercard Checkout :", error);
            }

            function cancelCallback() {
                log("Paiement annulé par l'utilisateur.");
            }

            async function startCheckout() {
                const btn = document.getElementById("payBtn");
                btn.disabled = true;
                btn.textContent = "Création de la session Mastercard...";

                try {
                    const response = await fetch("/api/payments/mastercard/create-checkout-session", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            amount: 500,
                            currency: "XAF",
                            description: "Test Hosted Checkout Mastercard sécurisé",
                        })
                    });

                    const data = await response.json();
                    log("Réponse backend reçue :", data);

                    const gateway = data.gateway_response || {};
                    const gatewayBody = gateway.response || {};
                    const session = gatewayBody.session || {};
                    const sessionId = session.id;

                    if (!data.success || !gateway.success || !sessionId) {
                        throw new Error("Session Mastercard non générée. Vérifier la réponse backend.");
                    }

                    log("Session Mastercard créée : " + sessionId);

                    Checkout.configure({
                        session: {
                            id: sessionId
                        }
                    });

                    log("Ouverture de la page Hosted Checkout Mastercard...");
                    Checkout.showPaymentPage();

                } catch (err) {
                    log("Erreur lors du lancement Hosted Checkout :", {
                        message: err.message || String(err)
                    });
                    btn.disabled = false;
                    btn.textContent = "Relancer le test de paiement";
                }
            }
        </script>
    </head>

    <body>
        <div class="card">
            <h1>Test Mastercard Hosted Checkout</h1>

            <p>
                Cette page teste l’ouverture réelle de la page de paiement Mastercard
                avec sauvegarde sécurisée de la session et du résultat de paiement.
            </p>

            <div class="info">
                Aucun mot de passe Mastercard n’est exposé dans cette page.
                Le backend crée la session, puis le navigateur reçoit uniquement le <strong>session.id</strong>.
            </div>

            <button id="payBtn" onclick="startCheckout()">Payer 500 XAF en Sandbox</button>

            <pre id="log">En attente du test...</pre>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content, status_code=200)


@router.get("/records/latest")
async def mastercard_latest_payment_record(
    order_id: str = "",
    result_indicator: str = "",
    session_id: str = "",
    dossier_id: str = "",
    client_reference: str = "",
):
    """
    Retourne un résumé sécurisé du paiement Mastercard.
    Ne retourne pas de secrets, pas de token 3DS, pas de réponse brute Mastercard.
    """
    filters = {
        "order_id": order_id.strip(),
        "resultIndicator": result_indicator.strip(),
        "session_id": session_id.strip(),
        "dossier_id": dossier_id.strip(),
        "client_reference": client_reference.strip(),
    }

    if not any(filters.values()):
        return JSONResponse({
            "success": False,
            "status": "MISSING_FILTER",
            "message": "Un filtre est requis : order_id, result_indicator, session_id, dossier_id ou client_reference."
        }, status_code=400)

    if not PAYMENT_RECORDS_FILE.exists():
        return JSONResponse({
            "success": False,
            "status": "NO_PAYMENT_RECORDS",
            "message": "Aucun paiement Mastercard enregistré."
        }, status_code=404)

    records = []

    with PAYMENT_RECORDS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                continue

    for record in reversed(records):
        matched = True

        if filters["order_id"] and str(record.get("order_id") or "") != filters["order_id"]:
            matched = False

        if filters["resultIndicator"] and str(record.get("resultIndicator") or "") != filters["resultIndicator"]:
            matched = False

        if filters["session_id"] and str(record.get("session_id") or "") != filters["session_id"]:
            matched = False

        if filters["dossier_id"] and str(record.get("dossier_id") or "") != filters["dossier_id"]:
            matched = False

        if filters["client_reference"] and str(record.get("client_reference") or "") != filters["client_reference"]:
            matched = False

        if matched:
            safe_record = {
                "paid": record.get("paid"),
                "verification_status": record.get("verification_status"),
                "order_id": record.get("order_id"),
                "amount_captured": record.get("amount_captured"),
                "currency": record.get("currency"),
                "result": record.get("result"),
                "status": record.get("status"),
                "gatewayCode": record.get("gatewayCode"),
                "authorizationCode": record.get("authorizationCode"),
                "receipt": record.get("receipt"),
                "masked_card": record.get("masked_card"),
                "card_brand": record.get("card_brand"),
                "verified_at": record.get("verified_at"),
            }

            return JSONResponse({
                "success": True,
                "status": "PAYMENT_RECORD_FOUND",
                "payment": safe_record,
            })

    return JSONResponse({
        "success": False,
        "status": "PAYMENT_RECORD_NOT_FOUND",
        "message": "Aucun paiement ne correspond aux critères fournis."
    }, status_code=404)


@router.get("/records/latest")
async def mastercard_latest_payment_record(
    order_id: str = "",
    result_indicator: str = "",
    session_id: str = "",
    dossier_id: str = "",
    client_reference: str = "",
):
    """
    Retourne un résumé sécurisé du paiement Mastercard.
    Ne retourne pas de secrets, pas de token 3DS, pas de réponse brute Mastercard.
    """
    filters = {
        "order_id": order_id.strip(),
        "resultIndicator": result_indicator.strip(),
        "session_id": session_id.strip(),
        "dossier_id": dossier_id.strip(),
        "client_reference": client_reference.strip(),
    }

    if not any(filters.values()):
        return JSONResponse({
            "success": False,
            "status": "MISSING_FILTER",
            "message": "Un filtre est requis : order_id, result_indicator, session_id, dossier_id ou client_reference."
        }, status_code=400)

    if not PAYMENT_RECORDS_FILE.exists():
        return JSONResponse({
            "success": False,
            "status": "NO_PAYMENT_RECORDS",
            "message": "Aucun paiement Mastercard enregistré."
        }, status_code=404)

    records = []

    with PAYMENT_RECORDS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                continue

    for record in reversed(records):
        matched = True

        if filters["order_id"] and str(record.get("order_id") or "") != filters["order_id"]:
            matched = False

        if filters["resultIndicator"] and str(record.get("resultIndicator") or "") != filters["resultIndicator"]:
            matched = False

        if filters["session_id"] and str(record.get("session_id") or "") != filters["session_id"]:
            matched = False

        if filters["dossier_id"] and str(record.get("dossier_id") or "") != filters["dossier_id"]:
            matched = False

        if filters["client_reference"] and str(record.get("client_reference") or "") != filters["client_reference"]:
            matched = False

        if matched:
            safe_record = {
                "paid": record.get("paid"),
                "verification_status": record.get("verification_status"),
                "order_id": record.get("order_id"),
                "amount_captured": record.get("amount_captured"),
                "currency": record.get("currency"),
                "result": record.get("result"),
                "status": record.get("status"),
                "gatewayCode": record.get("gatewayCode"),
                "authorizationCode": record.get("authorizationCode"),
                "receipt": record.get("receipt"),
                "masked_card": record.get("masked_card"),
                "card_brand": record.get("card_brand"),
                "verified_at": record.get("verified_at"),
            }

            return JSONResponse({
                "success": True,
                "status": "PAYMENT_RECORD_FOUND",
                "payment": safe_record,
            })

    return JSONResponse({
        "success": False,
        "status": "PAYMENT_RECORD_NOT_FOUND",
        "message": "Aucun paiement ne correspond aux critères fournis."
    }, status_code=404)


# PACKAGE_MASTERCARD_CHECKOUT_ROUTE_V1
from pathlib import Path as _McPath


try:
    SESSIONS_FILE
except NameError:
    SESSIONS_FILE = _McPath("data") / "mastercard_checkout_sessions.jsonl"


def _mc_load_checkout_sessions_for_package():
    records = []

    if not SESSIONS_FILE.exists():
        return records

    with SESSIONS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                records.append(json.loads(line))
            except Exception:
                continue

    return records


def _mc_find_checkout_session_by_payment_reference(payment_reference: str):
    ref = str(payment_reference or "").strip()

    if not ref:
        return None

    for record in reversed(_mc_load_checkout_sessions_for_package()):
        if str(record.get("payment_reference") or "") == ref:
            return record

        if str(record.get("order_id") or "") == ref:
            return record

    return None


@router.get("/checkout/{payment_reference}", response_class=HTMLResponse)
async def mastercard_package_checkout_page(payment_reference: str):
    import html

    record = _mc_find_checkout_session_by_payment_reference(payment_reference)

    if not record:
        return HTMLResponse(
            """
            <!doctype html>
            <html lang="fr">
            <head>
                <meta charset="utf-8">
                <title>Paiement introuvable</title>
            </head>
            <body style="font-family:Arial;background:#f4f6f9;padding:30px;">
                <div style="max-width:680px;margin:auto;background:white;padding:24px;border-radius:16px;">
                    <h1 style="color:#b91c1c;">Paiement introuvable</h1>
                    <p>La session de paiement Mastercard demandée est introuvable ou expirée.</p>
                    <a href="/client/status">Retour au suivi client</a>
                </div>
            </body>
            </html>
            """,
            status_code=404
        )

    session_id = html.escape(str(record.get("session_id") or ""))
    order_id = html.escape(str(record.get("payment_reference") or record.get("order_id") or payment_reference))
    application_reference = html.escape(str(record.get("application_reference") or ""))
    package_name = html.escape(str(record.get("package_name") or "Package bancaire"))
    amount = html.escape(str(record.get("amount") or ""))
    currency = html.escape(str(record.get("currency") or "XAF"))

    return HTMLResponse(f"""
    <!doctype html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Paiement Mastercard</title>

        <script src="https://na-gateway.mastercard.com/static/checkout/checkout.min.js"
                data-error="errorCallback"
                data-cancel="cancelCallback"></script>

        <style>
            body {{
                margin: 0;
                font-family: Arial, sans-serif;
                background: #F4F6F9;
                color: #111827;
                padding: 24px;
            }}
            .card {{
                max-width: 720px;
                margin: 30px auto;
                background: white;
                border-radius: 18px;
                padding: 28px;
                box-shadow: 0 14px 38px rgba(15, 23, 42, 0.10);
                border-top: 6px solid #D22630;
            }}
            h1 {{
                margin-top: 0;
                color: #D22630;
            }}
            .line {{
                margin: 10px 0;
                line-height: 1.5;
            }}
            .amount {{
                margin-top: 18px;
                background: #fff7df;
                border: 1px solid #facc15;
                border-radius: 14px;
                padding: 16px;
                font-size: 20px;
                font-weight: 800;
            }}
            .btn {{
                display: inline-block;
                margin-top: 22px;
                background: #D22630;
                color: white;
                border: none;
                border-radius: 12px;
                padding: 15px 20px;
                font-size: 16px;
                font-weight: 800;
                cursor: pointer;
            }}
            .muted {{
                margin-top: 18px;
                color: #6b7280;
                font-size: 13px;
            }}
            code {{
                background: #f3f4f6;
                padding: 3px 6px;
                border-radius: 6px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Paiement sécurisé Mastercard</h1>

            <p class="line">
                Vous allez être redirigé vers la page sécurisée Mastercard pour finaliser le paiement.
            </p>

            <p class="line"><strong>Référence paiement :</strong> <code>{order_id}</code></p>
            <p class="line"><strong>Dossier :</strong> <code>{application_reference}</code></p>
            <p class="line"><strong>Package :</strong> {package_name}</p>

            <div class="amount">
                Montant à payer : {amount} {currency}
            </div>

            <button class="btn" onclick="startPayment()">
                Payer maintenant
            </button>

            <p class="muted">
                Vos informations de carte sont saisies sur l’interface sécurisée Mastercard.
                Elles ne sont pas stockées dans cette application.
            </p>
        </div>

        <script>
            function errorCallback(error) {{
                alert("Une erreur est survenue pendant le paiement. Veuillez réessayer.");
                console.log(JSON.stringify(error));
            }}

            function cancelCallback() {{
                alert("Paiement annulé.");
            }}

            function startPayment() {{
                Checkout.configure({{
                    session: {{
                        id: "{session_id}"
                    }}
                }});

                Checkout.showPaymentPage();
            }}
        </script>
    </body>
    </html>
    """)


# PACKAGE_MASTERCARD_CHECKOUT_ROUTE_V1
from pathlib import Path as _McPath


try:
    SESSIONS_FILE
except NameError:
    SESSIONS_FILE = _McPath("data") / "mastercard_checkout_sessions.jsonl"


def _mc_load_checkout_sessions_for_package():
    records = []

    if not SESSIONS_FILE.exists():
        return records

    with SESSIONS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                records.append(json.loads(line))
            except Exception:
                continue

    return records


def _mc_find_checkout_session_by_payment_reference(payment_reference: str):
    ref = str(payment_reference or "").strip()

    if not ref:
        return None

    for record in reversed(_mc_load_checkout_sessions_for_package()):
        if str(record.get("payment_reference") or "") == ref:
            return record

        if str(record.get("order_id") or "") == ref:
            return record

    return None


@router.get("/checkout/{payment_reference}", response_class=HTMLResponse)
async def mastercard_package_checkout_page(payment_reference: str):
    import html

    record = _mc_find_checkout_session_by_payment_reference(payment_reference)

    if not record:
        return HTMLResponse(
            """
            <!doctype html>
            <html lang="fr">
            <head>
                <meta charset="utf-8">
                <title>Paiement introuvable</title>
            </head>
            <body style="font-family:Arial;background:#f4f6f9;padding:30px;">
                <div style="max-width:680px;margin:auto;background:white;padding:24px;border-radius:16px;">
                    <h1 style="color:#b91c1c;">Paiement introuvable</h1>
                    <p>La session de paiement Mastercard demandée est introuvable ou expirée.</p>
                    <a href="/client/status">Retour au suivi client</a>
                </div>
            </body>
            </html>
            """,
            status_code=404
        )

    session_id = html.escape(str(record.get("session_id") or ""))
    order_id = html.escape(str(record.get("payment_reference") or record.get("order_id") or payment_reference))
    application_reference = html.escape(str(record.get("application_reference") or ""))
    package_name = html.escape(str(record.get("package_name") or "Package bancaire"))
    amount = html.escape(str(record.get("amount") or ""))
    currency = html.escape(str(record.get("currency") or "XAF"))

    return HTMLResponse(f"""
    <!doctype html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Paiement Mastercard</title>

        <script src="https://na-gateway.mastercard.com/static/checkout/checkout.min.js"
                data-error="errorCallback"
                data-cancel="cancelCallback"></script>

        <style>
            body {{
                margin: 0;
                font-family: Arial, sans-serif;
                background: #F4F6F9;
                color: #111827;
                padding: 24px;
            }}
            .card {{
                max-width: 720px;
                margin: 30px auto;
                background: white;
                border-radius: 18px;
                padding: 28px;
                box-shadow: 0 14px 38px rgba(15, 23, 42, 0.10);
                border-top: 6px solid #D22630;
            }}
            h1 {{
                margin-top: 0;
                color: #D22630;
            }}
            .line {{
                margin: 10px 0;
                line-height: 1.5;
            }}
            .amount {{
                margin-top: 18px;
                background: #fff7df;
                border: 1px solid #facc15;
                border-radius: 14px;
                padding: 16px;
                font-size: 20px;
                font-weight: 800;
            }}
            .btn {{
                display: inline-block;
                margin-top: 22px;
                background: #D22630;
                color: white;
                border: none;
                border-radius: 12px;
                padding: 15px 20px;
                font-size: 16px;
                font-weight: 800;
                cursor: pointer;
            }}
            .muted {{
                margin-top: 18px;
                color: #6b7280;
                font-size: 13px;
            }}
            code {{
                background: #f3f4f6;
                padding: 3px 6px;
                border-radius: 6px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Paiement sécurisé Mastercard</h1>

            <p class="line">
                Vous allez être redirigé vers la page sécurisée Mastercard pour finaliser le paiement.
            </p>

            <p class="line"><strong>Référence paiement :</strong> <code>{order_id}</code></p>
            <p class="line"><strong>Dossier :</strong> <code>{application_reference}</code></p>
            <p class="line"><strong>Package :</strong> {package_name}</p>

            <div class="amount">
                Montant à payer : {amount} {currency}
            </div>

            <button class="btn" onclick="startPayment()">
                Payer maintenant
            </button>

            <p class="muted">
                Vos informations de carte sont saisies sur l’interface sécurisée Mastercard.
                Elles ne sont pas stockées dans cette application.
            </p>
        </div>

        <script>
            function errorCallback(error) {{
                alert("Une erreur est survenue pendant le paiement. Veuillez réessayer.");
                console.log(JSON.stringify(error));
            }}

            function cancelCallback() {{
                alert("Paiement annulé.");
            }}

            function startPayment() {{
                Checkout.configure({{
                    session: {{
                        id: "{session_id}"
                    }}
                }});

                Checkout.showPaymentPage();
            }}
        </script>
    </body>
    </html>
    """)


# PACKAGE_MASTERCARD_CHECKOUT_ROUTE_V1
from pathlib import Path as _McPath


try:
    SESSIONS_FILE
except NameError:
    SESSIONS_FILE = _McPath("data") / "mastercard_checkout_sessions.jsonl"


def _mc_load_checkout_sessions_for_package():
    records = []

    if not SESSIONS_FILE.exists():
        return records

    with SESSIONS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                records.append(json.loads(line))
            except Exception:
                continue

    return records


def _mc_find_checkout_session_by_payment_reference(payment_reference: str):
    ref = str(payment_reference or "").strip()

    if not ref:
        return None

    for record in reversed(_mc_load_checkout_sessions_for_package()):
        if str(record.get("payment_reference") or "") == ref:
            return record

        if str(record.get("order_id") or "") == ref:
            return record

    return None


@router.get("/checkout/{payment_reference}", response_class=HTMLResponse)
async def mastercard_package_checkout_page(payment_reference: str):
    import html

    record = _mc_find_checkout_session_by_payment_reference(payment_reference)

    if not record:
        return HTMLResponse(
            """
            <!doctype html>
            <html lang="fr">
            <head>
                <meta charset="utf-8">
                <title>Paiement introuvable</title>
            </head>
            <body style="font-family:Arial;background:#f4f6f9;padding:30px;">
                <div style="max-width:680px;margin:auto;background:white;padding:24px;border-radius:16px;">
                    <h1 style="color:#b91c1c;">Paiement introuvable</h1>
                    <p>La session de paiement Mastercard demandée est introuvable ou expirée.</p>
                    <a href="/client/status">Retour au suivi client</a>
                </div>
            </body>
            </html>
            """,
            status_code=404
        )

    session_id = html.escape(str(record.get("session_id") or ""))
    order_id = html.escape(str(record.get("payment_reference") or record.get("order_id") or payment_reference))
    application_reference = html.escape(str(record.get("application_reference") or ""))
    package_name = html.escape(str(record.get("package_name") or "Package bancaire"))
    amount = html.escape(str(record.get("amount") or ""))
    currency = html.escape(str(record.get("currency") or "XAF"))

    return HTMLResponse(f"""
    <!doctype html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Paiement Mastercard</title>

        <script src="https://na-gateway.mastercard.com/static/checkout/checkout.min.js"
                data-error="errorCallback"
                data-cancel="cancelCallback"></script>

        <style>
            body {{
                margin: 0;
                font-family: Arial, sans-serif;
                background: #F4F6F9;
                color: #111827;
                padding: 24px;
            }}
            .card {{
                max-width: 720px;
                margin: 30px auto;
                background: white;
                border-radius: 18px;
                padding: 28px;
                box-shadow: 0 14px 38px rgba(15, 23, 42, 0.10);
                border-top: 6px solid #D22630;
            }}
            h1 {{
                margin-top: 0;
                color: #D22630;
            }}
            .line {{
                margin: 10px 0;
                line-height: 1.5;
            }}
            .amount {{
                margin-top: 18px;
                background: #fff7df;
                border: 1px solid #facc15;
                border-radius: 14px;
                padding: 16px;
                font-size: 20px;
                font-weight: 800;
            }}
            .btn {{
                display: inline-block;
                margin-top: 22px;
                background: #D22630;
                color: white;
                border: none;
                border-radius: 12px;
                padding: 15px 20px;
                font-size: 16px;
                font-weight: 800;
                cursor: pointer;
            }}
            .muted {{
                margin-top: 18px;
                color: #6b7280;
                font-size: 13px;
            }}
            code {{
                background: #f3f4f6;
                padding: 3px 6px;
                border-radius: 6px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Paiement sécurisé Mastercard</h1>

            <p class="line">
                Vous allez être redirigé vers la page sécurisée Mastercard pour finaliser le paiement.
            </p>

            <p class="line"><strong>Référence paiement :</strong> <code>{order_id}</code></p>
            <p class="line"><strong>Dossier :</strong> <code>{application_reference}</code></p>
            <p class="line"><strong>Package :</strong> {package_name}</p>

            <div class="amount">
                Montant à payer : {amount} {currency}
            </div>

            <button class="btn" onclick="startPayment()">
                Payer maintenant
            </button>

            <p class="muted">
                Vos informations de carte sont saisies sur l’interface sécurisée Mastercard.
                Elles ne sont pas stockées dans cette application.
            </p>
        </div>

        <script>
            function errorCallback(error) {{
                alert("Une erreur est survenue pendant le paiement. Veuillez réessayer.");
                console.log(JSON.stringify(error));
            }}

            function cancelCallback() {{
                alert("Paiement annulé.");
            }}

            function startPayment() {{
                Checkout.configure({{
                    session: {{
                        id: "{session_id}"
                    }}
                }});

                Checkout.showPaymentPage();
            }}
        </script>
    </body>
    </html>
    """)



# PACKAGE_PAYMENT_DB_UPDATE_AFTER_MPGS_RETURN_V1
def _mc_mark_package_payment_confirmed(payment_record: dict, matched_session: dict):
    """
    Met à jour PaymentTransaction et AccountApplication après confirmation serveur Mastercard.
    Idempotent : si le paiement est déjà confirmé, on ne casse rien.
    """
    try:
        from datetime import datetime
        import json as _json

        from app.database import SessionLocal
        from app.models import AccountApplication, PaymentTransaction

        if not payment_record or not matched_session:
            return {
                "updated": False,
                "status": "MISSING_PAYMENT_RECORD_OR_SESSION"
            }

        paid = bool(payment_record.get("paid") is True)

        payment_reference = (
            matched_session.get("payment_reference")
            or matched_session.get("order_id")
            or payment_record.get("order_id")
        )

        application_reference = matched_session.get("application_reference")
        session_id = matched_session.get("session_id") or payment_record.get("session_id")

        if not paid:
            return {
                "updated": False,
                "status": "PAYMENT_NOT_CONFIRMED",
                "payment_reference": payment_reference,
                "application_reference": application_reference,
            }

        db = SessionLocal()

        try:
            payment = None

            if payment_reference:
                payment = db.query(PaymentTransaction).filter(
                    PaymentTransaction.payment_reference == payment_reference
                ).first()

            if not payment and session_id:
                payment = db.query(PaymentTransaction).filter(
                    PaymentTransaction.provider_transaction_id == session_id
                ).first()

            if not payment and application_reference:
                payment = db.query(PaymentTransaction).filter(
                    PaymentTransaction.application_reference == application_reference,
                    PaymentTransaction.status == "PENDING"
                ).order_by(PaymentTransaction.id.desc()).first()

            application = None

            if application_reference:
                application = db.query(AccountApplication).filter(
                    AccountApplication.reference == application_reference
                ).first()

            if not application and payment and payment.application_reference:
                application = db.query(AccountApplication).filter(
                    AccountApplication.reference == payment.application_reference
                ).first()

            if not payment:
                return {
                    "updated": False,
                    "status": "PAYMENT_TRANSACTION_NOT_FOUND",
                    "payment_reference": payment_reference,
                    "application_reference": application_reference,
                }

            already_paid = str(payment.status or "").upper() == "PAID"

            payment.status = "PAID"
            payment.paid_at = payment.paid_at or datetime.utcnow()
            payment.provider_transaction_id = session_id or payment.provider_transaction_id
            payment.raw_response = _json.dumps({
                "source": "MASTERCARD_MPGS_RETRIEVE_ORDER",
                "summary": payment_record,
            }, ensure_ascii=False)

            if application:
                application.status = "PAYMENT_CONFIRMED"

                if hasattr(application, "package_payment_reference"):
                    application.package_payment_reference = payment.payment_reference

                if hasattr(application, "package_payment_status"):
                    application.package_payment_status = "PAYMENT_CONFIRMED"

                if hasattr(application, "package_payment_provider"):
                    application.package_payment_provider = "MASTERCARD"

                if hasattr(application, "package_payment_amount"):
                    application.package_payment_amount = payment.amount

                if hasattr(application, "package_payment_currency"):
                    application.package_payment_currency = payment.currency

                if hasattr(application, "package_payment_url"):
                    application.package_payment_url = payment.payment_url

            db.commit()

            # WHATSAPP_ON_REAL_MPGS_PAYMENT_CONFIRMED_V1
            whatsapp_notification = None

            if application and not already_paid:
                try:
                    from app.services.whatsapp_notification_service import send_whatsapp_notification

                    whatsapp_notification = send_whatsapp_notification(
                        phone=getattr(application, "phone", None),
                        event_type="PAIEMENT_CONFIRME",
                        context={
                            "full_name": f"{getattr(application, 'first_name', '') or ''} {getattr(application, 'last_name', '') or ''}".strip(),
                            "reference": getattr(application, "reference", None),
                            "application_reference": getattr(application, "reference", None),
                            "payment_reference": payment.payment_reference,
                            "package_name": getattr(payment, "package_name", None),
                            "amount": getattr(payment, "amount", None),
                            "currency": getattr(payment, "currency", None),
                        },
                        dry_run=None
                    )
                except Exception as notify_exc:
                    whatsapp_notification = {
                        "status": "WHATSAPP_NOTIFICATION_FAILED",
                        "sent": False,
                        "error": str(notify_exc)
                    }

            return {
                "updated": True,
                "status": "ALREADY_CONFIRMED" if already_paid else "PAYMENT_CONFIRMED_IN_DATABASE",
                "payment_reference": payment.payment_reference,
                "application_reference": payment.application_reference,
                "application_status": getattr(application, "status", None) if application else None,
                "package_payment_status": getattr(application, "package_payment_status", None) if application else None,
                "whatsapp_notification": whatsapp_notification,
            }

        finally:
            db.close()

    except Exception as exc:
        return {
            "updated": False,
            "status": "DATABASE_UPDATE_ERROR",
            "error": str(exc),
        }


# BACKOFFICE_PAYMENT_SUMMARY_API_V1
@router.get("/application-payment-summary/{application_reference}")
async def mastercard_application_payment_summary(application_reference: str):
    """
    Résumé sécurisé du paiement package Mastercard pour un dossier.
    Utilisé par le back-office pour afficher l'état du paiement.
    """
    try:
        from app.database import SessionLocal
        from app.models import AccountApplication, PaymentTransaction

        db = SessionLocal()

        try:
            application = db.query(AccountApplication).filter(
                AccountApplication.reference == application_reference
            ).first()

            if not application:
                return JSONResponse({
                    "success": False,
                    "status": "APPLICATION_NOT_FOUND",
                    "message": "Dossier introuvable."
                }, status_code=404)

            payment = db.query(PaymentTransaction).filter(
                PaymentTransaction.application_reference == application.reference
            ).order_by(PaymentTransaction.id.desc()).first()

            amount_due = float(getattr(application, "package_payment_amount", 0) or 0)
            package_status = str(getattr(application, "package_payment_status", "") or "")
            payment_required = bool(getattr(application, "selected_package_payment_required", False)) or amount_due > 0

            payment_status = str(getattr(payment, "status", "") or "") if payment else package_status

            confirmed = (
                str(package_status).upper() in ["PAYMENT_CONFIRMED", "PAID"]
                or str(payment_status).upper() in ["PAID", "PAYMENT_CONFIRMED"]
            )

            pending = (
                payment_required
                and not confirmed
                and str(payment_status).upper() in ["PENDING", "APPROVED_PENDING_PAYMENT", "PAYMENT_PENDING"]
            )

            return JSONResponse({
                "success": True,
                "status": "PAYMENT_SUMMARY_FOUND",
                "application": {
                    "id": getattr(application, "id", None),
                    "reference": application.reference,
                    "client_name": f"{getattr(application, 'first_name', '') or ''} {getattr(application, 'last_name', '') or ''}".strip(),
                    "email": getattr(application, "email", None),
                    "application_status": getattr(application, "status", None),
                    "review_decision": getattr(application, "review_decision", None),
                    "package_name": getattr(application, "selected_package_name", None),
                    "payment_required": payment_required,
                    "package_payment_reference": getattr(application, "package_payment_reference", None),
                    "package_payment_status": getattr(application, "package_payment_status", None),
                    "package_payment_provider": getattr(application, "package_payment_provider", None),
                    "package_payment_amount": getattr(application, "package_payment_amount", None),
                    "package_payment_currency": getattr(application, "package_payment_currency", None),
                    "package_payment_url": getattr(application, "package_payment_url", None),
                },
                "payment": {
                    "exists": payment is not None,
                    "payment_reference": getattr(payment, "payment_reference", None) if payment else None,
                    "amount": getattr(payment, "amount", None) if payment else None,
                    "currency": getattr(payment, "currency", None) if payment else None,
                    "provider": getattr(payment, "provider", None) if payment else None,
                    "provider_transaction_id": getattr(payment, "provider_transaction_id", None) if payment else None,
                    "status": getattr(payment, "status", None) if payment else None,
                    "payment_url": getattr(payment, "payment_url", None) if payment else None,
                    "created_at": getattr(payment, "created_at", None).isoformat() if payment and getattr(payment, "created_at", None) else None,
                    "paid_at": getattr(payment, "paid_at", None).isoformat() if payment and getattr(payment, "paid_at", None) else None,
                    "failed_at": getattr(payment, "failed_at", None).isoformat() if payment and getattr(payment, "failed_at", None) else None,
                },
                "computed": {
                    "payment_required": payment_required,
                    "payment_confirmed": confirmed,
                    "payment_pending": pending,
                    "can_open_account": (not payment_required) or confirmed,
                    "blocking_reason": None if ((not payment_required) or confirmed) else "Paiement package requis mais non confirmé."
                }
            })

        finally:
            db.close()

    except Exception as exc:
        return JSONResponse({
            "success": False,
            "status": "PAYMENT_SUMMARY_ERROR",
            "message": str(exc)
        }, status_code=500)
