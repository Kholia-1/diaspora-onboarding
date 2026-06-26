from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountApplication, ApplicationDocument
from app.schemas import ApplicationResponse, BackOfficeDecision


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
            "risk_level": application.risk_level,
            "kyc_score": application.kyc_score,
            "document_score": application.document_score,
            "blackmodule_status": application.blackmodule_status,
            "blackmodule_score": application.blackmodule_score,
            "blackmodule_alert": application.blackmodule_alert,
            "review_decision": application.review_decision,
            "review_comment": application.review_comment
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
        "COMPLIANCE_REVIEW"
    ]

    if payload.decision not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Décision invalide. Valeurs autorisées : {allowed}"
        )

    application.review_decision = payload.decision
    application.reviewed_by = payload.reviewed_by
    application.review_comment = payload.comment
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

    compliance_review = db.query(AccountApplication).filter(
        AccountApplication.status == "COMPLIANCE_REVIEW"
    ).count()

    return {
        "total_demandes": total,
        "demandes_soumises": submitted,
        "alertes_blackmodule": blackmodule_alerts,
        "revue_conformite": compliance_review,
        "dossiers_approuves": approved,
        "dossiers_rejetes": rejected
    }