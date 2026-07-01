from pathlib import Path
import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountApplication, ApplicationDocument
from app.schemas import ApplicationResponse, BackOfficeDecision
from app.services.notification_service import notify_application_status_changed



def get_document_type_label(document_type: str) -> str:
    labels = {
        "IDENTITY_DOCUMENT": "Pièce d’identité officielle",
        "IDENTITY_DOCUMENT_PHOTO": "Pièce d’identité officielle",
        "IDENTITY_DOCUMENT_RECTO": "Pièce d’identité officielle - Recto",
        "IDENTITY_DOCUMENT_VERSO": "Pièce d’identité officielle - Verso",
        "IDENTITY_DOCUMENT_IMPORTED": "Pièce d’identité officielle importée",

        "CNI_RECTO": "Pièce d’identité - recto",
        "CNI_VERSO": "Pièce d’identité - verso",
        "PASSPORT_DOCUMENT": "Passeport",
        "RESIDENCE_PERMIT_RECTO": "Titre de séjour - recto",
        "RESIDENCE_PERMIT_VERSO": "Titre de séjour - verso",
        "CONSULAR_CARD_RECTO": "Carte consulaire - recto",
        "CONSULAR_CARD_VERSO": "Carte consulaire - verso",
        "ADDRESS_PROOF": "Justificatif de domicile",
        "CLIENT_PHOTO": "Photo client",
        "CLIENT_VIDEO": "Vidéo client",

        "PROOF_OF_ADDRESS_PHOTO": "Justificatif de domicile",

        "INCOME_PROOF": "Preuve de justification de revenu / activité",
        "RIB_DOCUMENT": "Relevé d’identification bancaire - RIB",

        "SELFIE_PHOTO": "Selfie / preuve de vie - Photo",
        "SELFIE_VIDEO": "Selfie / preuve de vie - Vidéo",
        "SELFIE_IMPORTED": "Selfie importé",

        "BIRTH_CERTIFICATE_PHOTO": "Acte de naissance ou pièce avec filiation",
        "EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO": "Fiche de paie / attestation d’emploi / scolarité",
        "TAX_COMPLIANCE_CERTIFICATE_PHOTO": "Attestation de conformité fiscale",
    }

    return labels.get(document_type, document_type or "Document")



def get_document_filename(doc) -> str:
    return str(
        getattr(doc, "original_filename", None)
        or getattr(doc, "file_name", None)
        or getattr(doc, "filename", None)
        or getattr(doc, "file_path", None)
        or getattr(doc, "path", "")
        or ""
    )


def is_video_document(doc) -> bool:
    mime = str(getattr(doc, "mime_type", "") or "").lower()
    name = get_document_filename(doc).lower()
    document_type = str(getattr(doc, "document_type", "") or "").upper()

    return (
        mime.startswith("video/")
        or name.endswith((".webm", ".mp4", ".mov"))
        or document_type in {"CLIENT_VIDEO", "SELFIE_VIDEO"}
    )


def is_photo_identity_media_only(doc) -> bool:
    document_type = str(getattr(doc, "document_type", "") or "").upper()

    return document_type in {
        "CLIENT_PHOTO",
        "CLIENT_VIDEO",
        "SELFIE_PHOTO",
        "SELFIE_VIDEO"
    }


def is_analysis_available(doc) -> bool:
    if is_video_document(doc) or is_photo_identity_media_only(doc):
        return False

    file_path = str(getattr(doc, "file_path", "") or "")
    if not file_path:
        return False

    return os.path.exists(file_path + ".analysis.enc")


def latest_documents_by_type(documents):
    """
    Garde uniquement le dernier document de chaque type,
    puis retourne les documents dans un ordre métier logique pour le back-office.
    """

    latest = {}

    for doc in documents:
        key = str(getattr(doc, "document_type", "") or f"DOC_{getattr(doc, 'id', '')}")

        current = latest.get(key)

        if current is None:
            latest[key] = doc
            continue

        if int(getattr(doc, "id", 0) or 0) >= int(getattr(current, "id", 0) or 0):
            latest[key] = doc

    # BACKOFFICE_DOCUMENT_ORDER_CLEAN_V1
    document_order = {
        "CNI_RECTO": 10,
        "IDENTITY_DOCUMENT_RECTO": 11,
        "CNI_VERSO": 12,
        "IDENTITY_DOCUMENT_VERSO": 13,
        "IDENTITY_DOCUMENT": 14,
        "IDENTITY_DOCUMENT_PHOTO": 15,
        "IDENTITY_DOCUMENT_IMPORTED": 16,
        "PASSPORT_DOCUMENT": 17,
        "RESIDENCE_PERMIT_RECTO": 18,
        "RESIDENCE_PERMIT_VERSO": 19,
        "CONSULAR_CARD_RECTO": 20,
        "CONSULAR_CARD_VERSO": 21,

        "ADDRESS_PROOF": 30,
        "PROOF_OF_ADDRESS_PHOTO": 31,

        "INCOME_PROOF": 40,
        "RIB_DOCUMENT": 50,

        "CLIENT_PHOTO": 60,
        "SELFIE_PHOTO": 61,
        "SELFIE_IMPORTED": 62,
        "CLIENT_VIDEO": 70,
        "SELFIE_VIDEO": 71,

        "BIRTH_CERTIFICATE_PHOTO": 80,
        "EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO": 81,
        "TAX_COMPLIANCE_CERTIFICATE_PHOTO": 82,
    }

    def sort_key(doc):
        doc_type = str(getattr(doc, "document_type", "") or "").upper()
        doc_id = int(getattr(doc, "id", 0) or 0)

        return (
            document_order.get(doc_type, 999),
            -doc_id
        )

    return sorted(latest.values(), key=sort_key)


router = APIRouter(
    prefix="/api/backoffice",
    tags=["Back Office"]
)


@router.get("/applications", response_model=list[ApplicationResponse])
def list_applications(db: Session = Depends(get_db)):
    return (
        db.query(AccountApplication)
        .order_by(AccountApplication.created_at.desc())
        .all()
    )


@router.get("/applications/{application_id}")
def get_application_detail(application_id: str, db: Session = Depends(get_db)):
    application = _find_application_by_id_or_reference(db, application_id)

    if not application:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    documents = db.query(ApplicationDocument).filter(
        ApplicationDocument.application_id == application.id
    ).all()

    # BACKOFFICE_HIDE_JSON_DOCUMENTS_V1
    documents = [
        doc for doc in documents
        if not str(
            getattr(doc, "file_name", None)
            or getattr(doc, "filename", None)
            or getattr(doc, "original_filename", None)
            or getattr(doc, "file_path", None)
            or getattr(doc, "path", "")
        ).lower().endswith(".json")
    ]

    # BACKOFFICE_LATEST_DOCUMENTS_BY_TYPE_V1
    documents = latest_documents_by_type(documents)

    return {
        "application": {
            "id": application.id,
            "reference": application.reference,
            "last_name": application.last_name,
            "first_name": application.first_name,
            "birth_date": application.birth_date,
            "birth_place": application.birth_place,
            "birth_department": application.birth_department,
            "birth_name": application.birth_name,
            "residency_status": application.residency_status,
            "address_location": application.address_location,
            "postal_box": application.postal_box,
            "phone": application.phone,
            "email": application.email,
            "contact_person_1_name": application.contact_person_1_name,
            "contact_person_1_phone": application.contact_person_1_phone,
            "contact_person_2_name": application.contact_person_2_name,
            "contact_person_2_phone": application.contact_person_2_phone,
            "father_name": application.father_name,
            "mother_name": application.mother_name,
            "nationality": application.nationality,
            "residence": application.residence,
            "sex": application.sex,
            "marital_status": application.marital_status,
            "matrimonial_regime": application.matrimonial_regime,
            "identity_document_number": application.identity_document_number,
            "identity_document_issue_date": application.identity_document_issue_date,
            "identity_document_issue_place": application.identity_document_issue_place,
            "rib": application.rib,
            "income_range": application.income_range,
            "income_currency": application.income_currency,
            "activity_sector": application.activity_sector,
            "activity_sector_code": application.activity_sector_code,
            "activity_subsector": getattr(application, "activity_subsector", None),
            "activity_subsector_code": getattr(application, "activity_subsector_code", None),
            "account_object": application.account_object,
            "account_object_other": application.account_object_other,
            "funds_origin": application.funds_origin,
            "funds_origin_other": application.funds_origin_other,
            "account_type": application.account_type,
            "selected_package_code": getattr(application, "selected_package_code", None),
            "selected_package_name": getattr(application, "selected_package_name", None),
            "selected_package_currency": getattr(application, "selected_package_currency", None),
            "selected_package_opening_fee": getattr(application, "selected_package_opening_fee", 0),
            "selected_package_subscription_fee": getattr(application, "selected_package_subscription_fee", 0),
            "selected_package_monthly_fee": getattr(application, "selected_package_monthly_fee", 0),
            "selected_package_payment_required": getattr(application, "selected_package_payment_required", False),
            "preferred_branch": application.preferred_branch,
            "account_purpose": application.account_purpose,
            "is_pep": application.is_pep,
            "pep_details": application.pep_details,
            "status": application.status,
        "client_message": application.client_message,
        "final_rib": application.final_rib,
        "account_number": application.account_number,
        "client_message": application.client_message,
        "final_rib": application.final_rib,
        "account_number": application.account_number,
            "risk_level": application.risk_level,
            "kyc_score": application.kyc_score,
            "document_score": application.document_score,
            "blackmodule_status": application.blackmodule_status,
            "blackmodule_score": application.blackmodule_score,
            "blackmodule_alert": application.blackmodule_alert,
            "review_decision": application.review_decision,
            "review_comment": application.review_comment,
            "client_message": application.client_message,
            "final_rib": application.final_rib,
            "account_number": application.account_number
        },
        "documents": [
            {
                "id": doc.id,
                "document_type": doc.document_type,
                "document_type_code": doc.document_type,
                "document_label": get_document_type_label(doc.document_type),
                "original_filename": doc.original_filename,
                "mime_type": doc.mime_type,
                "verification_status": doc.verification_status,
                "quality_score": doc.quality_score,
                "sha256_hash": doc.sha256_hash,

                # Ne pas utiliser directement file_path dans le front.
                # Le document est chiffré, il doit passer par cette route.
                "content_url": f"/api/applications/documents/{doc.id}/content",
                "analysis_url": (
                    f"/api/applications/documents/{doc.id}/analysis"
                    if is_analysis_available(doc)
                    else None
                ),
                "can_analyze": is_analysis_available(doc),
                "is_video": is_video_document(doc),
                "is_media_only": is_photo_identity_media_only(doc)
            }
            for doc in documents
        ]
    }


@router.post("/applications/{application_id}/decision")
def decide_application(
    application_id: int,
    payload: BackOfficeDecision,
    db: Session = Depends(get_db)
):
    application = db.query(AccountApplication).filter(
        AccountApplication.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    allowed = [
        "APPROVED",
        "REJECTED",
        "NEED_MORE_DOCUMENTS",
        "COMPLIANCE_REVIEW",
        "ACCOUNT_OPENED"
    ]

    if payload.decision not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Décision invalide. Valeurs autorisées : {allowed}"
        )

    application.review_decision = payload.decision
    application.reviewed_by = payload.reviewed_by
    application.review_comment = payload.comment
    application.client_message = payload.client_message
    application.final_rib = payload.final_rib
    application.account_number = payload.account_number
    application.reviewed_at = datetime.utcnow()
    application.status = payload.decision

    db.commit()
    db.refresh(application)

    return {
        "message": "Décision back-office enregistrée",
        "reference": application.reference,
        "decision": application.review_decision,
        "reviewed_by": application.reviewed_by,
        "status": application.status
    }


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    total = db.query(AccountApplication).count()

    submitted = db.query(AccountApplication).filter(
        AccountApplication.status == "SUBMITTED"
    ).count()

    blackmodule_alerts = db.query(AccountApplication).filter(
        AccountApplication.status == "BLACKMODULE_ALERT"
    ).count()

    approved = db.query(AccountApplication).filter(
        AccountApplication.status == "APPROVED"
    ).count()

    rejected = db.query(AccountApplication).filter(
        AccountApplication.status == "REJECTED"
    ).count()

    account_opened = db.query(AccountApplication).filter(
        AccountApplication.status == "ACCOUNT_OPENED"
    ).count()

    compliance_review = db.query(AccountApplication).filter(
        AccountApplication.status == "COMPLIANCE_REVIEW"
    ).count()

    return {
        "total_demandes": total,
        "demandes_soumises": submitted,
        "alertes_blackmodule": blackmodule_alerts,
        "revue_conformite": compliance_review,
        "dossiers_approuves": approved,
        "dossiers_rejetes": rejected,
        "comptes_ouverts": account_opened
    }


PACKAGES_CONFIG_PATH = Path("data/packages.json")

DEFAULT_PACKAGES = [
    {
        "code": "BUDGET",
        "name": "Package Budget",
        "description": "Destiné aux clients recherchant l’essentiel bancaire à coût maîtrisé.",
        "services": ["SMS First", "Carte Fellow", "SARA Banking"],
        "currency": "XAF",
        "opening_fee": 0,
        "subscription_fee": 0,
        "monthly_fee": 0,
        "payment_required": False,
        "active": True,
        "display_order": 1,
        "customer_type": "PARTICULIER",
        "mastercard_item_code": "PKG_BUDGET",
        "whatsapp_template": "package_budget_selected"
    },
    {
        "code": "BUSINESS",
        "name": "Package Business",
        "description": "Pour les professionnels et clients ayant des besoins bancaires étendus.",
        "services": ["SMS First", "Assurance", "Découvert permanent", "Carte Visa Classique"],
        "currency": "XAF",
        "opening_fee": 0,
        "subscription_fee": 0,
        "monthly_fee": 0,
        "payment_required": False,
        "active": True,
        "display_order": 2,
        "customer_type": "PROFESSIONNEL",
        "mastercard_item_code": "PKG_BUSINESS",
        "whatsapp_template": "package_business_selected"
    },
    {
        "code": "ECO",
        "name": "Package Eco",
        "description": "L’essentiel au meilleur prix pour une ouverture de compte simplifiée.",
        "services": ["SMS First", "Assurance", "SARA Banking"],
        "currency": "XAF",
        "opening_fee": 0,
        "subscription_fee": 0,
        "monthly_fee": 0,
        "payment_required": False,
        "active": True,
        "display_order": 3,
        "customer_type": "PARTICULIER",
        "mastercard_item_code": "PKG_ECO",
        "whatsapp_template": "package_eco_selected"
    }
]


def _bool_value(value, default=False):
    if isinstance(value, bool):
        return value

    if value is None:
        return default

    return str(value).strip().lower() in {"1", "true", "yes", "oui", "on"}


def _money_value(value):
    if value is None or value == "":
        return 0

    try:
        return float(str(value).replace(" ", "").replace(",", "."))
    except Exception:
        return 0


def _int_value(value, default=100):
    try:
        return int(value)
    except Exception:
        return default


def normalize_package_item(item: dict, index: int = 0):
    name = str(item.get("name") or "").strip()
    code = str(item.get("code") or name.upper().replace(" ", "_")).strip().upper()
    description = str(item.get("description") or "").strip()
    currency = str(item.get("currency") or "XAF").strip().upper()
    customer_type = str(item.get("customer_type") or "TOUS").strip().upper()
    mastercard_item_code = str(item.get("mastercard_item_code") or code).strip().upper()
    whatsapp_template = str(item.get("whatsapp_template") or f"{code.lower()}_selected").strip()

    services = item.get("services") or []

    if isinstance(services, str):
        services = [x.strip() for x in services.replace(",", "\n").split("\n") if x.strip()]

    if not isinstance(services, list):
        services = []

    services = [str(x).strip() for x in services if str(x).strip()]

    return {
        "code": code,
        "name": name or code,
        "description": description,
        "services": services,
        "currency": currency,
        "opening_fee": _money_value(item.get("opening_fee")),
        "subscription_fee": _money_value(item.get("subscription_fee")),
        "monthly_fee": _money_value(item.get("monthly_fee")),
        "payment_required": _bool_value(item.get("payment_required"), False),
        "active": _bool_value(item.get("active"), True),
        "display_order": _int_value(item.get("display_order"), index + 1),
        "customer_type": customer_type,
        "mastercard_item_code": mastercard_item_code,
        "whatsapp_template": whatsapp_template
    }


def ensure_packages_config():
    PACKAGES_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not PACKAGES_CONFIG_PATH.exists():
        PACKAGES_CONFIG_PATH.write_text(
            json.dumps({"packages": DEFAULT_PACKAGES}, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

    data = json.loads(PACKAGES_CONFIG_PATH.read_text(encoding="utf-8"))
    packages = data.get("packages") or DEFAULT_PACKAGES

    normalized = [
        normalize_package_item(item, index)
        for index, item in enumerate(packages)
    ]

    normalized = sorted(
        normalized,
        key=lambda item: (int(item.get("display_order") or 100), item.get("name") or "")
    )

    return {"packages": normalized}


@router.get("/packages")
def get_packages_config():
    return ensure_packages_config()


@router.post("/packages")
def save_packages_config(payload: dict = Body(...)):
    packages = payload.get("packages")

    if not isinstance(packages, list):
        raise HTTPException(status_code=400, detail="Le champ packages doit être une liste.")

    cleaned = []

    for index, item in enumerate(packages):
        if not isinstance(item, dict):
            continue

        package = normalize_package_item(item, index)

        if not package["code"] or not package["name"]:
            continue

        cleaned.append(package)

    cleaned = sorted(
        cleaned,
        key=lambda item: (int(item.get("display_order") or 100), item.get("name") or "")
    )

    PACKAGES_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    PACKAGES_CONFIG_PATH.write_text(
        json.dumps({"packages": cleaned}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return {
        "message": "Configuration des packages enregistrée",
        "packages": cleaned
    }


def _find_application_by_id_or_reference(db, application_id):
    """
    Retrouve un dossier soit par ID numérique interne, soit par référence publique DIA-...
    """
    raw = str(application_id or "").strip()

    if not raw:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    # Cas 1 : ID numérique interne
    if raw.isdigit():
        application = db.query(AccountApplication).filter(AccountApplication.id == int(raw)).first()
        if application:
            return application

    # Cas 2 : référence publique, ex: DIA-20260629-3B6110BA
    # Recherche dans toutes les colonnes texte du modèle
    for column in AccountApplication.__table__.columns:
        if column.name == "id":
            continue

        try:
            if column.type.python_type is not str:
                continue
        except Exception:
            continue

        model_column = getattr(AccountApplication, column.name, None)
        if model_column is None:
            continue

        application = db.query(AccountApplication).filter(model_column == raw).first()
        if application:
            return application

    raise HTTPException(status_code=404, detail="Dossier introuvable")

