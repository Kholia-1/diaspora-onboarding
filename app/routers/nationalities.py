from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Nationality
from app.schemas import NationalityCreate, NationalityUpdate, NationalityResponse


router = APIRouter(
    prefix="/api/nationalities",
    tags=["Nationalités"]
)


@router.get("", response_model=list[NationalityResponse])
def list_nationalities(
    q: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Nationality)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Nationality.label.ilike(search),
                Nationality.code.ilike(search)
            )
        )

    return query.order_by(Nationality.label.asc()).all()


@router.get("/active", response_model=list[NationalityResponse])
def list_active_nationalities(
    q: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Nationality).filter(Nationality.active == True)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Nationality.label.ilike(search),
                Nationality.code.ilike(search)
            )
        )

    return query.order_by(Nationality.label.asc()).all()


@router.post("", response_model=NationalityResponse)
def create_nationality(payload: NationalityCreate, db: Session = Depends(get_db)):
    existing_code = db.query(Nationality).filter(
        Nationality.code == payload.code.upper().strip()
    ).first()

    if existing_code:
        raise HTTPException(status_code=400, detail="Ce code existe déjà.")

    existing_label = db.query(Nationality).filter(
        Nationality.label == payload.label.strip()
    ).first()

    if existing_label:
        raise HTTPException(status_code=400, detail="Cette nationalité existe déjà.")

    nationality = Nationality(
        code=payload.code.upper().strip(),
        label=payload.label.strip(),
        active=payload.active
    )

    db.add(nationality)
    db.commit()
    db.refresh(nationality)

    return nationality


@router.put("/{nationality_id}", response_model=NationalityResponse)
def update_nationality(
    nationality_id: int,
    payload: NationalityUpdate,
    db: Session = Depends(get_db)
):
    nationality = db.query(Nationality).filter(
        Nationality.id == nationality_id
    ).first()

    if not nationality:
        raise HTTPException(status_code=404, detail="Nationalité introuvable.")

    if payload.code is not None:
        nationality.code = payload.code.upper().strip()

    if payload.label is not None:
        nationality.label = payload.label.strip()

    if payload.active is not None:
        nationality.active = payload.active

    db.commit()
    db.refresh(nationality)

    return nationality


@router.delete("/{nationality_id}")
def delete_nationality(nationality_id: int, db: Session = Depends(get_db)):
    nationality = db.query(Nationality).filter(
        Nationality.id == nationality_id
    ).first()

    if not nationality:
        raise HTTPException(status_code=404, detail="Nationalité introuvable.")

    nationality.active = False

    db.commit()

    return {
        "message": "Nationalité désactivée avec succès.",
        "nationality_id": nationality.id
    }