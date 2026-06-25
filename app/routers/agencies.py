from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Agency
from app.schemas import AgencyCreate, AgencyUpdate, AgencyResponse


router = APIRouter(
    prefix="/api/agencies",
    tags=["Agences"]
)


@router.get("", response_model=list[AgencyResponse])
def list_agencies(
    q: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Agency)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Agency.name.ilike(search),
                Agency.code.ilike(search),
                Agency.city.ilike(search)
            )
        )

    return query.order_by(Agency.name.asc()).all()


@router.get("/active", response_model=list[AgencyResponse])
def list_active_agencies(
    q: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Agency).filter(Agency.active == True)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Agency.name.ilike(search),
                Agency.code.ilike(search),
                Agency.city.ilike(search)
            )
        )

    return query.order_by(Agency.name.asc()).all()


@router.post("", response_model=AgencyResponse)
def create_agency(payload: AgencyCreate, db: Session = Depends(get_db)):
    existing_code = db.query(Agency).filter(Agency.code == payload.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Ce code agence existe déjà.")

    existing_name = db.query(Agency).filter(Agency.name == payload.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="Cette agence existe déjà.")

    agency = Agency(
        code=payload.code.upper().strip(),
        name=payload.name.strip(),
        city=payload.city,
        country=payload.country,
        active=payload.active
    )

    db.add(agency)
    db.commit()
    db.refresh(agency)

    return agency


@router.put("/{agency_id}", response_model=AgencyResponse)
def update_agency(
    agency_id: int,
    payload: AgencyUpdate,
    db: Session = Depends(get_db)
):
    agency = db.query(Agency).filter(Agency.id == agency_id).first()

    if not agency:
        raise HTTPException(status_code=404, detail="Agence introuvable.")

    if payload.code is not None:
        agency.code = payload.code.upper().strip()

    if payload.name is not None:
        agency.name = payload.name.strip()

    if payload.city is not None:
        agency.city = payload.city

    if payload.country is not None:
        agency.country = payload.country

    if payload.active is not None:
        agency.active = payload.active

    db.commit()
    db.refresh(agency)

    return agency


@router.delete("/{agency_id}")
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    agency = db.query(Agency).filter(Agency.id == agency_id).first()

    if not agency:
        raise HTTPException(status_code=404, detail="Agence introuvable.")

    agency.active = False

    db.commit()

    return {
        "message": "Agence désactivée avec succès.",
        "agency_id": agency.id
    }