from pathlib import Path
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountApplication, ApplicationDocument
from app.schemas import ApplicationResponse, BackOfficeDecision
from app.services.notification_service import notify_application_status_changed


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
def get_application_detail(application_id: int, db: Session = Depends(get_db)):
    application = db.query(AccountApplication).filter(
        AccountApplication.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    documents = db.query(ApplicationDocument).filter(
        ApplicationDocument.application_id == application.id
    ).all()

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
            "account_object": application.account_object,
            "account_object_other": application.account_object_other,
            "funds_origin": application.funds_origin,
            "funds_origin_other": application.funds_origin_other,
            "account_type": application.account_type,
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
                "original_filename": doc.original_filename,
                "mime_type": doc.mime_type,
                "verification_status": doc.verification_status,
                "quality_score": doc.quality_score,
                "sha256_hash": doc.sha256_hash,

                # Ne pas utiliser directement file_path dans le front.
                # Le document est chiffré, il doit passer par cette route.
                "content_url": f"/api/applications/documents/{doc.id}/content",
                "analysis_url": f"/api/applications/documents/{doc.id}/analysis"
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
        "description": "Destiné aux petites bourses",
        "services": ["SMS First", "Carte Fellow", "SARA Banking"],
        "active": True
    },
    {
        "code": "BUSINESS",
        "name": "Package Business",
        "description": "Pour les professionnels",
        "services": ["SMS First", "Assurance", "Découvert permanent", "Carte Visa Classique"],
        "active": True
    },
    {
        "code": "ECO",
        "name": "Package Eco",
        "description": "L’essentiel au meilleur prix",
        "services": ["SMS First", "Assurance", "SARA Banking"],
        "active": True
    }
]


def ensure_packages_config():
    PACKAGES_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not PACKAGES_CONFIG_PATH.exists():
        PACKAGES_CONFIG_PATH.write_text(
            json.dumps({"packages": DEFAULT_PACKAGES}, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

    return json.loads(PACKAGES_CONFIG_PATH.read_text(encoding="utf-8"))


@router.get("/packages")
def get_packages_config():
    return ensure_packages_config()


@router.post("/packages")
def save_packages_config(payload: dict = Body(...)):
    packages = payload.get("packages")

    if not isinstance(packages, list):
        raise HTTPException(status_code=400, detail="Le champ packages doit être une liste.")

    cleaned = []

    for item in packages:
        name = str(item.get("name") or "").strip()
        code = str(item.get("code") or name.upper().replace(" ", "_")).strip()
        description = str(item.get("description") or "").strip()
        active = bool(item.get("active", True))
        services = item.get("services") or []

        if isinstance(services, str):
            services = [x.strip() for x in services.split(",") if x.strip()]

        cleaned.append({
            "code": code,
            "name": name,
            "description": description,
            "services": services,
            "active": active
        })

    PACKAGES_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    PACKAGES_CONFIG_PATH.write_text(
        json.dumps({"packages": cleaned}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return {
        "message": "Configuration des packages enregistrée",
        "packages": cleaned
    }
