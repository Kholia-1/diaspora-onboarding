from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.routers.mastercard_payments_public import (
    _mc_find_checkout_session_by_payment_reference,
    retrieve_order,
    summarize_retrieve_order,
    payment_record_already_exists,
    append_event,
    append_payment_record,
    _mc_mark_package_payment_confirmed,
    safe_float,
)

router = APIRouter(
    prefix="/api/payments/mastercard",
    tags=["Mastercard Manual Verify"],
)


@router.api_route("/verify/{payment_reference}", methods=["GET", "POST"])
async def mastercard_verify_payment_reference(payment_reference: str):
    """
    Vérification serveur d'un paiement Mastercard existant.

    Règle stricte :
    - CAPTURED + montant capturé suffisant = paiement confirmé.
    - AUTHENTICATED seul = paiement non confirmé.
    """
    payment_reference = str(payment_reference or "").strip()

    if not payment_reference:
        return JSONResponse({
            "success": False,
            "status": "PAYMENT_REFERENCE_REQUIRED",
            "message": "Référence paiement requise."
        }, status_code=400)

    matched_session = _mc_find_checkout_session_by_payment_reference(payment_reference)

    if not matched_session:
        return JSONResponse({
            "success": False,
            "status": "CHECKOUT_SESSION_NOT_FOUND",
            "message": "Aucune session Mastercard sauvegardée pour cette référence.",
            "payment_reference": payment_reference
        }, status_code=404)

    order_id = (
        matched_session.get("order_id")
        or matched_session.get("payment_reference")
        or payment_reference
    )

    verification = retrieve_order(
        order_id=order_id,
        dry_run=False,
    )

    payment_record = summarize_retrieve_order(
        verification=verification,
        matched_session=matched_session,
        result_indicator=matched_session.get("successIndicator") or ""
    )

    if payment_record_already_exists(payment_record):
        append_event("mastercard_manual_verify_duplicate_record_ignored", {
            "payment_reference": payment_reference,
            "order_id": payment_record.get("order_id"),
            "receipt": payment_record.get("receipt"),
            "paid": payment_record.get("paid"),
            "status": payment_record.get("status"),
            "amount_captured": payment_record.get("amount_captured"),
        })
    else:
        append_payment_record(payment_record)

    database_update = _mc_mark_package_payment_confirmed(payment_record, matched_session)
    payment_record["database_update"] = database_update

    paid = bool(payment_record.get("paid"))
    mastercard_status = str(payment_record.get("status") or "").upper()
    captured_amount = safe_float(payment_record.get("amount_captured"))

    if paid:
        final_status = "PAYMENT_CONFIRMED"
        message = "Paiement Mastercard confirmé et base mise à jour."
    elif mastercard_status == "AUTHENTICATED" and captured_amount <= 0:
        final_status = "AUTHENTICATED_NOT_CAPTURED"
        message = "Carte authentifiée, mais aucun montant capturé. Paiement non confirmé."
    else:
        final_status = "PAYMENT_NOT_CONFIRMED"
        message = "Paiement non confirmé selon Retrieve Order Mastercard."

    append_event("mastercard_manual_verify_payment_reference", {
        "payment_reference": payment_reference,
        "order_id": order_id,
        "paid": paid,
        "final_status": final_status,
        "mastercard_status": payment_record.get("status"),
        "result": payment_record.get("result"),
        "gatewayCode": payment_record.get("gatewayCode"),
        "amount_expected": payment_record.get("amount_expected"),
        "amount_captured": payment_record.get("amount_captured"),
        "amount_authorized": payment_record.get("amount_authorized"),
        "database_update": database_update,
    })

    return JSONResponse({
        "success": True,
        "status": final_status,
        "message": message,
        "payment_reference": payment_reference,
        "order_id": order_id,
        "paid": paid,
        "mastercard": {
            "verification_status": payment_record.get("verification_status"),
            "result": payment_record.get("result"),
            "status": payment_record.get("status"),
            "authenticationStatus": payment_record.get("authenticationStatus"),
            "gatewayCode": payment_record.get("gatewayCode"),
            "gatewayRecommendation": payment_record.get("gatewayRecommendation"),
            "amount_expected": payment_record.get("amount_expected"),
            "amount_authorized": payment_record.get("amount_authorized"),
            "amount_captured": payment_record.get("amount_captured"),
            "currency": payment_record.get("currency"),
            "transaction_id": payment_record.get("transaction_id"),
            "receipt": payment_record.get("receipt"),
        },
        "database_update": database_update,
    })
