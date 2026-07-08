from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountApplication, AccountOpeningRecord


router = APIRouter(
    prefix="/api/applications",
    tags=["Suivi client - compte ouvert"]
)


def first_attr(obj, names, default=None):
    for name in names:
        if hasattr(obj, name):
            value = getattr(obj, name)
            if value not in [None, ""]:
                return value
    return default


def normalize_email(value):
    return str(value or "").strip().lower()


@router.get("/{application_reference}/opened-account-public")
def get_opened_account_for_client(
    application_reference: str,
    email: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Consultation côté client des informations de compte ouvert.

    Sécurité minimale prototype :
    - référence dossier obligatoire
    - email client obligatoire
    - l'email doit correspondre au dossier
    """

    application = db.query(AccountApplication).filter(
        AccountApplication.reference == application_reference
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")

    if normalize_email(application.email) != normalize_email(email):
        raise HTTPException(status_code=403, detail="Email non autorisé pour ce dossier.")

    status = str(getattr(application, "status", "") or "").upper()

    record = db.query(AccountOpeningRecord).filter(
        AccountOpeningRecord.application_reference == application.reference
    ).first()

    account_number = None
    rib = None
    opened_at = None

    if record:
        account_number = record.account_number
        rib = record.rib
        opened_at = record.created_at

    # Fallback : si l'ancienne décision back-office a stocké les infos directement sur le dossier.
    if not account_number:
        account_number = first_attr(application, [
            "account_number",
            "assigned_account_number",
            "final_account_number",
            "opened_account_number",
            "rib_account_number"
        ])

    if not rib:
        rib = first_attr(application, [
            "final_rib",
            "rib",
            "account_rib",
            "opened_account_rib"
        ])

    message_to_client = first_attr(application, [
        "message_to_client",
        "client_message",
        "final_message",
        "decision_message",
        "review_comment"
    ])

    payment_status = first_attr(application, [
        "package_payment_status",
        "payment_status"
    ])

    is_opened = status == "ACCOUNT_OPENED" or bool(account_number or rib or record)

    if not is_opened:
        raise HTTPException(status_code=404, detail="Le compte n'est pas encore ouvert pour ce dossier.")

    return {
        "application_reference": application.reference,
        "status": status,
        "client_email": application.email,
        "account_opened": True,
        "account_number": account_number,
        "rib": rib,
        "message_to_client": message_to_client,
        "payment_status": payment_status,
        "opened_at": opened_at
    }
