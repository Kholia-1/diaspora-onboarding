import os
import hashlib
import mimetypes
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountApplication, ApplicationDocument
from app.schemas import ApplicationCreate, ApplicationResponse
from app.services.blackmodule_client import screen_client_with_blackmodule
from app.services.document_auth_service import (
    analyze_document_content,
    decrypt_bytes,
    encrypt_bytes,
    load_encrypted_json,
    save_encrypted_json,
)


router = APIRouter(
    prefix="/api/applications",
    tags=["Parcours Client Diaspora"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_UPLOAD_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "video/webm",
    "video/mp4",
    "video/quicktime",
}

EXTENSION_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "video/webm": ".webm",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
}


def generate_reference():
    return "DIA-" + datetime.utcnow().strftime("%Y%m%d") + "-" + uuid4().hex[:8].upper()


def sha256_bytes(data: bytes):
    return hashlib.sha256(data).hexdigest()


def normalize_text(value: str | None):
    if not value:
        return None
    value = value.strip()
    return value if value else None


def calculate_kyc_score(application: AccountApplication):
    score = 0

    if application.first_name and application.last_name:
        score += 10

    if application.birth_date and application.birth_place:
        score += 10

    if application.birth_department:
        score += 5

    if application.birth_name:
        score += 5

    if application.residency_status:
        score += 5

    if application.phone and application.email:
        score += 10

    if application.address_location:
        score += 10

    if application.contact_person_1_name and application.contact_person_1_phone:
        score += 10

    if application.contact_person_2_name and application.contact_person_2_phone:
        score += 5

    if application.father_name and application.mother_name:
        score += 10

    if application.nationality and application.residence:
        score += 10

    if application.sex and application.marital_status:
        score += 5

    if (
        application.identity_document_number
        and application.identity_document_issue_date
        and application.identity_document_issue_place
    ):
        score += 15

    if application.account_type and application.preferred_branch:
        score += 10

    if application.account_object and application.funds_origin:
        score += 10

    if application.rib:
        score += 5

    if application.is_pep:
        score -= 10
    else:
        score += 5

    return max(0, min(score, 100))


def calculate_document_score(application: AccountApplication, uploaded_document_types: set[str]):
    """
    Score documentaire par familles de pièces.
    Le score ne compte pas seulement le nombre de fichiers, mais vérifie que les pièces attendues sont présentes.
    """

    required_groups = [
        {
            "IDENTITY_DOCUMENT",
            "IDENTITY_DOCUMENT_PHOTO",
            "IDENTITY_DOCUMENT_RECTO",
            "IDENTITY_DOCUMENT_IMPORTED",
        },
        {
            "INCOME_PROOF",
            "INCOME_PROOF",
        },
        {
            "SELFIE",
            "SELFIE_PHOTO",
            "SELFIE_VIDEO",
            "SELFIE_IMPORTED",
        },
    ]

    if application.rib:
        required_groups.append({
            "RIB_DOCUMENT",
        })

    if application.residency_status == "NON_RESIDENT":
        required_groups.extend([
            {
                "BIRTH_CERTIFICATE_PHOTO",
                "BIRTH_CERTIFICATE",
                "IDENTITY_WITH_FILIATION",
            },
            {
                "EMPLOYMENT_OR_SCHOOL_CERTIFICATE_PHOTO",
                "EMPLOYMENT_OR_SCHOOL_CERTIFICATE",
            },
            {
                "TAX_COMPLIANCE_CERTIFICATE_PHOTO",
                "TAX_COMPLIANCE_CERTIFICATE",
            },
        ])

    matched_groups = 0

    for group in required_groups:
        if uploaded_document_types.intersection(group):
            matched_groups += 1

    if not required_groups:
        return 0

    return round((matched_groups / len(required_groups)) * 100)


def get_safe_extension(filename: str | None, content_type: str | None):
    extension = os.path.splitext(filename or "")[1].lower()

    if extension:
        return extension

    if content_type in EXTENSION_BY_MIME:
        return EXTENSION_BY_MIME[content_type]

    guessed_extension = mimetypes.guess_extension(content_type or "")
    return guessed_extension or ".bin"


@router.post("", response_model=ApplicationResponse)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    application = AccountApplication(
        reference=generate_reference(),

        last_name=payload.last_name.upper(),
        first_name=payload.first_name.upper(),
        birth_date=payload.birth_date,
        birth_place=payload.birth_place,
        birth_department=payload.birth_department,
        birth_name=payload.birth_name,
        residency_status=payload.residency_status,

        address_location=payload.address_location,
        postal_box=payload.postal_box,
        phone=payload.phone,
        email=payload.email,

        contact_person_1_name=payload.contact_person_1_name,
        contact_person_1_phone=payload.contact_person_1_phone,
        contact_person_2_name=payload.contact_person_2_name,
        contact_person_2_phone=payload.contact_person_2_phone,

        father_name=payload.father_name,
        mother_name=payload.mother_name,

        nationality=payload.nationality,
        residence=payload.residence,

        sex=payload.sex,
        marital_status=payload.marital_status,
        matrimonial_regime=payload.matrimonial_regime,

        identity_document_number=payload.identity_document_number,
        identity_document_issue_date=payload.identity_document_issue_date,
        identity_document_issue_place=payload.identity_document_issue_place,

        rib=payload.rib,
        income_range=payload.income_range,
        income_currency=payload.income_currency,
        account_object=payload.account_object,
        account_object_other=payload.account_object_other,
        funds_origin=payload.funds_origin,
        funds_origin_other=payload.funds_origin_other,

        account_type=payload.account_type,
        preferred_branch=payload.preferred_branch,
        account_purpose=payload.account_purpose,

        is_pep=payload.is_pep,
        pep_details=payload.pep_details,

        status="SUBMITTED"
    )

    application.kyc_score = calculate_kyc_score(application)

    db.add(application)
    db.commit()
    db.refresh(application)

    return application


@router.get("/status/{reference}")
def get_application_status(reference: str, email: str | None = None, db: Session = Depends(get_db)):
    application = db.query(AccountApplication).filter(
        AccountApplication.reference == reference
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Aucun dossier trouvé avec cette référence.")

    if email and application.email.lower() != email.lower():
        raise HTTPException(status_code=403, detail="L’email ne correspond pas à ce dossier.")

    return {
        "reference": application.reference,
        "full_name": f"{application.last_name} {application.first_name}",
        "email": application.email,
        "phone": application.phone,
        "preferred_branch": application.preferred_branch,
        "nationality": application.nationality,
        "residency_status": application.residency_status,
        "status": application.status,
        "risk_level": application.risk_level,
        "kyc_score": application.kyc_score,
        "document_score": application.document_score,
        "blackmodule_status": application.blackmodule_status,
        "created_at": application.created_at,
        "review_decision": application.review_decision,
        "review_comment": application.review_comment
    }


@router.get("/documents/{document_id}/content")
def get_document_content(document_id: int, db: Session = Depends(get_db)):
    document = db.query(ApplicationDocument).filter(
        ApplicationDocument.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document introuvable")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="Fichier document introuvable")

    with open(document.file_path, "rb") as f:
        encrypted_content = f.read()

    try:
        content = decrypt_bytes(encrypted_content)
    except Exception:
        raise HTTPException(status_code=500, detail="Impossible de déchiffrer le document")

    return Response(
        content=content,
        media_type=document.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{document.original_filename or "document"}"'
        }
    )


@router.get("/documents/{document_id}/analysis")
def get_document_analysis(document_id: int, db: Session = Depends(get_db)):
    document = db.query(ApplicationDocument).filter(
        ApplicationDocument.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document introuvable")

    meta_path = document.file_path + ".analysis.enc"

    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Analyse documentaire introuvable")

    try:
        analysis = load_encrypted_json(meta_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Impossible de lire l’analyse documentaire")

    return {
        "document_id": document.id,
        "document_type": document.document_type,
        "verification_status": document.verification_status,
        "quality_score": document.quality_score,
        "analysis": analysis,
    }


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(application_id: int, db: Session = Depends(get_db)):
    application = db.query(AccountApplication).filter(
        AccountApplication.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    return application


@router.post("/{application_id}/documents")
async def upload_document(
    application_id: int,
    document_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    application = db.query(AccountApplication).filter(
        AccountApplication.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Le fichier transmis est vide."
        )

    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Type de fichier non accepté. Formats autorisés : "
                "JPG, PNG, WEBP, PDF, WEBM, MP4 ou MOV."
            )
        )

    file_hash = sha256_bytes(content)
    extension = get_safe_extension(file.filename, file.content_type)

    analysis = analyze_document_content(
        content=content,
        mime_type=file.content_type,
        document_type=document_type,
        application=application,
    )

    filename = f"{application.reference}_{document_type}_{uuid4().hex}{extension}.enc"
    file_path = os.path.join(UPLOAD_DIR, filename)

    encrypted_content = encrypt_bytes(content)

    with open(file_path, "wb") as f:
        f.write(encrypted_content)

    save_encrypted_json(file_path, analysis)

    document = ApplicationDocument(
        application_id=application.id,
        document_type=document_type,
        original_filename=file.filename or filename.replace(".enc", ""),
        file_path=file_path,
        mime_type=file.content_type,
        sha256_hash=file_hash,
        verification_status=analysis["verification_status"],
        quality_score=analysis["quality_score"]
    )

    db.add(document)

    existing_document_types = {
        doc.document_type
        for doc in db.query(ApplicationDocument).filter(
            ApplicationDocument.application_id == application.id
        ).all()
    }

    uploaded_document_types = existing_document_types.union({document_type})
    application.document_score = calculate_document_score(application, uploaded_document_types)

    if application.kyc_score >= 70 and application.document_score >= 70:
        if application.status in ["SUBMITTED", "AUTO_KYC_REVIEW"]:
            application.status = "AUTO_KYC_OK"
    elif application.status == "SUBMITTED":
        application.status = "AUTO_KYC_REVIEW"

    db.commit()
    db.refresh(application)
    db.refresh(document)

    return {
        "message": "Document chargé avec succès",
        "application_reference": application.reference,
        "document_type": document_type,
        "filename": document.original_filename,
        "mime_type": document.mime_type,
        "sha256": file_hash,
        "document_score": application.document_score,
        "verification_status": document.verification_status,
        "quality_score": document.quality_score,
        "ocr_status": analysis.get("ocr", {}).get("ocr_status"),
        "match_status": analysis.get("matching", {}).get("match_status"),
        "match_score": analysis.get("matching", {}).get("match_score"),
        "ocr_text_preview": (analysis.get("ocr", {}).get("text") or "")[:300]
    }


@router.post("/{application_id}/screen-blackmodule")
async def screen_blackmodule(application_id: int, db: Session = Depends(get_db)):
    application = db.query(AccountApplication).filter(
        AccountApplication.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    payload = {
        "nom": application.last_name,
        "prenom": application.first_name,
        "date_naissance": str(application.birth_date) if application.birth_date else None,
        "lieu_naissance": application.birth_place,
        "nationalite": application.nationality,
        "residence": application.residence,
        "numero_piece": application.identity_document_number,
        "type_client": "PERSONNE_PHYSIQUE",
        "source": "DIASPORA_ONBOARDING",
        "reference_dossier": application.reference
    }

    result = await screen_client_with_blackmodule(payload)

    application.blackmodule_status = result["status"]
    application.blackmodule_score = result["score"]
    application.blackmodule_alert = result["alert"]
    application.risk_level = result["risk_level"]

    if result["status"] in ["POSSIBLE_MATCH", "HIGH_RISK", "MATCH"]:
        application.status = "BLACKMODULE_ALERT"
    elif result["status"] in ["BLACKMODULE_ERROR", "BLACKMODULE_UNAVAILABLE"]:
        application.status = "COMPLIANCE_REVIEW"
    else:
        if application.kyc_score >= 70 and application.document_score >= 70:
            application.status = "AUTO_KYC_OK"
        else:
            application.status = "AUTO_KYC_REVIEW"

    db.commit()
    db.refresh(application)

    return {
        "message": "Filtrage BLACKMODULE terminé",
        "application_reference": application.reference,
        "blackmodule_status": application.blackmodule_status,
        "blackmodule_score": application.blackmodule_score,
        "risk_level": application.risk_level,
        "alert": application.blackmodule_alert,
        "new_status": application.status
    }
