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


from app.services.notification_service import notify_application_submitted

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

        # WHATSAPP_OTP_SAVE_FIELDS_V1
        pre_onboarding_session_id=payload.pre_onboarding_session_id,
        whatsapp_phone_full=payload.whatsapp_phone_full or payload.phone,
        whatsapp_otp_verified=bool(payload.whatsapp_otp_verified),
        whatsapp_otp_verified_at=(
            payload.whatsapp_otp_verified_at
            or (datetime.now(timezone.utc) if payload.whatsapp_otp_verified else None)
        ),

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
        activity_sector=payload.activity_sector or payload.sector_of_activity or payload.economic_sector,
        activity_sector_code=payload.activity_sector_code,
        activity_subsector=payload.activity_subsector,
        activity_subsector_code=payload.activity_subsector_code,
        account_object=payload.account_object,
        account_object_other=payload.account_object_other,
        funds_origin=payload.funds_origin,
        funds_origin_other=payload.funds_origin_other,

        account_type=payload.account_type,
        preferred_branch=payload.preferred_branch,

        # APPLICATION_SELECTED_PACKAGE_SAVE_V1
        selected_package_code=payload.selected_package_code,
        selected_package_name=payload.selected_package_name,
        selected_package_currency=payload.selected_package_currency,
        selected_package_opening_fee=payload.selected_package_opening_fee or 0,
        selected_package_subscription_fee=payload.selected_package_subscription_fee or 0,
        selected_package_monthly_fee=payload.selected_package_monthly_fee or 0,
        selected_package_payment_required=bool(payload.selected_package_payment_required),
        account_purpose=payload.account_purpose,

        is_pep=payload.is_pep,
        pep_details=payload.pep_details,

        status="SUBMITTED"
    )

    application.kyc_score = calculate_kyc_score(application)

    db.add(application)
    db.commit()
    db.refresh(application)
    # APPLICATION_CREATE_ATTACH_PRE_ONBOARDING_CALL_V1
    pre_session_id = getattr(payload, "pre_onboarding_session_id", None)
    if pre_session_id:
        _attach_pre_onboarding_files(application, pre_session_id, db)
        db.commit()
        db.refresh(application)


    return application



# APPLICATION_STATUS_BY_EMAIL_V1
def application_status_payload(application):
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
        "review_comment": application.review_comment,
        "client_message": getattr(application, "client_message", None),
        "final_rib": getattr(application, "final_rib", None),
        "account_number": getattr(application, "account_number", None),

        # STATUS_PAYMENT_FIELDS_V1
        "selected_package_code": getattr(application, "selected_package_code", None),
        "selected_package_name": getattr(application, "selected_package_name", None),
        "selected_package_currency": getattr(application, "selected_package_currency", None),
        "selected_package_opening_fee": getattr(application, "selected_package_opening_fee", 0),
        "selected_package_subscription_fee": getattr(application, "selected_package_subscription_fee", 0),
        "selected_package_monthly_fee": getattr(application, "selected_package_monthly_fee", 0),
        "selected_package_payment_required": getattr(application, "selected_package_payment_required", False),
        "package_payment_reference": getattr(application, "package_payment_reference", None),
        "package_payment_status": getattr(application, "package_payment_status", None),
        "package_payment_provider": getattr(application, "package_payment_provider", None),
        "package_payment_amount": getattr(application, "package_payment_amount", 0),
        "package_payment_currency": getattr(application, "package_payment_currency", None),
        "package_payment_url": getattr(application, "package_payment_url", None),
    }


@router.get("/status-by-email")
def get_application_status_by_email(email: str, db: Session = Depends(get_db)):
    email_clean = (email or "").strip().lower()

    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Veuillez saisir une adresse email valide.")

    applications = (
        db.query(AccountApplication)
        .filter(AccountApplication.email.ilike(email_clean))
        .order_by(AccountApplication.created_at.desc())
        .all()
    )

    if not applications:
        raise HTTPException(status_code=404, detail="Aucun dossier trouvé pour cette adresse email.")

    return {
        "email": email_clean,
        "count": len(applications),
        "applications": [
            application_status_payload(application)
            for application in applications
        ]
    }


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
        raw_content = f.read()

    # APPLICATION_DOCUMENT_CONTENT_PLAIN_OR_ENCRYPTED_V1
    # Fichiers .enc : upload classique chiffré.
    # Fichiers sans .enc : fichiers copiés du pré-onboarding, déjà en clair.
    is_encrypted_file = str(document.file_path or "").lower().endswith(".enc")

    try:
        content = decrypt_bytes(raw_content) if is_encrypted_file else raw_content
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

    # APPLICATION_DOCUMENT_ANALYSIS_MEDIA_GUARD_V1
    document_type = str(document.document_type or "").upper()
    mime_type = str(document.mime_type or "").lower()

    if (
        document_type in {"CLIENT_PHOTO", "CLIENT_VIDEO", "SELFIE_PHOTO", "SELFIE_VIDEO"}
        or mime_type.startswith("video/")
    ):
        raise HTTPException(
            status_code=400,
            detail="Analyse OCR non disponible pour ce type de document."
        )

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

# APPLICATION_ATTACH_PRE_ONBOARDING_V1
def _attach_pre_onboarding_files(application, pre_onboarding_session_id: str, db):
    from pathlib import Path
    from datetime import datetime
    import os
    import re
    import json
    import shutil

    if not pre_onboarding_session_id:
        return 0

    def clean(value: str, default: str = "session") -> str:
        value = (value or "").strip()
        value = re.sub(r"[^A-Za-z0-9_-]", "_", value)
        return value[:100] or default

    session_safe = clean(pre_onboarding_session_id)

    pre_root = Path(os.getenv("PRE_ONBOARDING_UPLOAD_DIR", "uploads/pre_onboarding"))
    source_dir = pre_root / session_safe

    if not source_dir.exists():
        return 0

    app_id = getattr(application, "id", None)
    if not app_id:
        return 0

    final_root = Path(os.getenv("APPLICATION_UPLOAD_DIR", "uploads/applications"))
    final_dir = final_root / str(app_id) / "pre_onboarding"
    final_dir.mkdir(parents=True, exist_ok=True)

    columns = set(ApplicationDocument.__table__.columns.keys())
    created = 0

    # APPLICATION_ATTACH_LATEST_DOCS_ONLY_V1
    latest_metadata_files = {}

    for metadata_file in sorted(source_dir.glob("*.json")):
        try:
            metadata_preview = json.loads(metadata_file.read_text(encoding="utf-8"))
        except Exception:
            continue

        document_type_preview = metadata_preview.get("document_type") or "PRE_ONBOARDING_DOCUMENT"
        created_at_preview = metadata_preview.get("created_at") or ""

        current = latest_metadata_files.get(document_type_preview)

        if current is None or created_at_preview >= current["created_at"]:
            latest_metadata_files[document_type_preview] = {
                "created_at": created_at_preview,
                "metadata_file": metadata_file
            }

    for item in latest_metadata_files.values():
        metadata_file = item["metadata_file"]

        try:
            metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
        except Exception:
            continue

        source_path = Path(metadata.get("relative_path") or "")
        if not source_path.exists():
            source_path = source_dir / (metadata.get("stored_name") or "")

        if not source_path.exists() or not source_path.is_file():
            continue

        # APPLICATION_SKIP_JSON_PREONBOARDING_FILES_V1
        if source_path.suffix.lower() == ".json":
            continue

        stored_name = metadata.get("stored_name") or source_path.name
        target_path = final_dir / stored_name

        if not target_path.exists():
            shutil.copy2(source_path, target_path)

        document_type = metadata.get("document_type") or "PRE_ONBOARDING_DOCUMENT"

        values = {}

        def set_if(name, value):
            if name in columns:
                values[name] = value

        set_if("application_id", app_id)
        set_if("document_type", document_type)
        set_if("file_name", stored_name)
        set_if("filename", stored_name)
        set_if("original_filename", metadata.get("original_name") or stored_name)
        set_if("file_path", str(target_path))
        set_if("path", str(target_path))
        set_if("content_type", metadata.get("content_type"))
        set_if("mime_type", metadata.get("content_type"))
        set_if("file_size", metadata.get("size"))
        set_if("size", metadata.get("size"))
        set_if("status", "UPLOADED")
        set_if("analysis_status", "PENDING")
        set_if("source", "PRE_ONBOARDING")
        set_if("created_at", datetime.utcnow())
        set_if("uploaded_at", datetime.utcnow())

        # Remplir prudemment les colonnes obligatoires non couvertes
        for col in ApplicationDocument.__table__.columns:
            if col.primary_key or col.name in values:
                continue

            if col.nullable or col.default is not None or col.server_default is not None:
                continue

            col_type = col.type.__class__.__name__.lower()

            if "string" in col_type or "text" in col_type:
                values[col.name] = ""
            elif "integer" in col_type:
                values[col.name] = 0
            elif "boolean" in col_type:
                values[col.name] = False
            elif "datetime" in col_type or "date" in col_type:
                values[col.name] = datetime.utcnow()

        # Éviter doublons simples sur même application + type + nom
        query = db.query(ApplicationDocument)

        if "application_id" in columns:
            query = query.filter(ApplicationDocument.application_id == app_id)

        if "document_type" in columns:
            query = query.filter(ApplicationDocument.document_type == document_type)

        if "file_name" in columns:
            query = query.filter(ApplicationDocument.file_name == stored_name)
        elif "filename" in columns:
            query = query.filter(ApplicationDocument.filename == stored_name)

        existing = query.first()
        if existing:
            continue

        db.add(ApplicationDocument(**values))
        created += 1

    return created
