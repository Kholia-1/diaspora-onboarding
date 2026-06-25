from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Country
from app.schemas import CountryCreate, CountryUpdate, CountryResponse


router = APIRouter(
    prefix="/api/countries",
    tags=["Pays et indicatifs"]
)


@router.get("", response_model=list[CountryResponse])
def list_countries(
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Country)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Country.iso_code.ilike(search),
                Country.name_fr.ilike(search),
                Country.calling_code.ilike(search)
            )
        )

    return query.order_by(
        Country.display_order.asc(),
        Country.name_fr.asc()
    ).all()


@router.get("/active", response_model=list[CountryResponse])
def list_active_countries(
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Country).filter(Country.active == True)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Country.iso_code.ilike(search),
                Country.name_fr.ilike(search),
                Country.calling_code.ilike(search)
            )
        )

    return query.order_by(
        Country.display_order.asc(),
        Country.name_fr.asc()
    ).all()


@router.post("", response_model=CountryResponse)
def create_country(payload: CountryCreate, db: Session = Depends(get_db)):
    existing = db.query(Country).filter(
        Country.iso_code == payload.iso_code.upper().strip()
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Ce pays existe déjà.")

    country = Country(
        iso_code=payload.iso_code.upper().strip(),
        flag=payload.flag,
        name_fr=payload.name_fr.strip(),
        calling_code=payload.calling_code.strip(),
        active=payload.active,
        display_order=payload.display_order
    )

    db.add(country)
    db.commit()
    db.refresh(country)

    return country


@router.put("/{country_id}", response_model=CountryResponse)
def update_country(
    country_id: int,
    payload: CountryUpdate,
    db: Session = Depends(get_db)
):
    country = db.query(Country).filter(Country.id == country_id).first()

    if not country:
        raise HTTPException(status_code=404, detail="Pays introuvable.")

    if payload.iso_code is not None:
        country.iso_code = payload.iso_code.upper().strip()

    if payload.flag is not None:
        country.flag = payload.flag

    if payload.name_fr is not None:
        country.name_fr = payload.name_fr.strip()

    if payload.calling_code is not None:
        country.calling_code = payload.calling_code.strip()

    if payload.active is not None:
        country.active = payload.active

    if payload.display_order is not None:
        country.display_order = payload.display_order

    db.commit()
    db.refresh(country)

    return country


@router.delete("/{country_id}")
def delete_country(country_id: int, db: Session = Depends(get_db)):
    country = db.query(Country).filter(Country.id == country_id).first()

    if not country:
        raise HTTPException(status_code=404, detail="Pays introuvable.")

    country.active = False
    db.commit()

    return {
        "message": "Pays désactivé avec succès.",
        "country_id": country.id
    }