from datetime import datetime

from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Text, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class AccountApplication(Base):
    __tablename__ = "account_applications"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(80), unique=True, index=True, nullable=False)

    last_name = Column(String(100), nullable=False)
    first_name = Column(String(100), nullable=False)
    birth_date = Column(Date, nullable=True)
    birth_place = Column(String(150), nullable=True)
    birth_department = Column(String(150), nullable=True)
    birth_name = Column(String(150), nullable=True)
    residency_status = Column(String(50), default="RESIDENT")


    address_location = Column(Text, nullable=True)
    postal_box = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(150), nullable=False)

    contact_person_1_name = Column(String(150), nullable=True)
    contact_person_1_phone = Column(String(50), nullable=True)
    contact_person_2_name = Column(String(150), nullable=True)
    contact_person_2_phone = Column(String(50), nullable=True)

    father_name = Column(String(150), nullable=True)
    mother_name = Column(String(150), nullable=True)

    nationality = Column(String(100), nullable=True)
    residence = Column(String(150), nullable=True)

    sex = Column(String(20), nullable=True)
    marital_status = Column(String(50), nullable=True)
    matrimonial_regime = Column(String(150), nullable=True)

    identity_document_number = Column(String(100), nullable=True)
    identity_document_issue_date = Column(Date, nullable=True)
    identity_document_issue_place = Column(String(150), nullable=True)

    rib = Column(String(100), nullable=True)
    income_range = Column(String(100), nullable=True)
    income_currency = Column(String(20), nullable=True)

    account_object = Column(String(150), nullable=True)
    account_object_other = Column(Text, nullable=True)

    funds_origin = Column(String(150), nullable=True)
    funds_origin_other = Column(Text, nullable=True)

    account_type = Column(String(100), nullable=True)
    preferred_branch = Column(String(150), nullable=True)
    account_purpose = Column(Text, nullable=True)

    is_pep = Column(Boolean, default=False)
    pep_details = Column(Text, nullable=True)

    status = Column(String(60), default="SUBMITTED")
    risk_level = Column(String(60), default="NON_EVALUE")

    kyc_score = Column(Float, default=0)
    document_score = Column(Float, default=0)

    blackmodule_status = Column(String(60), default="NOT_SCREENED")
    blackmodule_score = Column(Float, default=0)
    blackmodule_alert = Column(Text, nullable=True)

    reviewed_by = Column(String(100), nullable=True)
    review_decision = Column(String(60), nullable=True)
    review_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = relationship(
        "ApplicationDocument",
        back_populates="application",
        cascade="all, delete-orphan"
    )


class ApplicationDocument(Base):
    __tablename__ = "application_documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("account_applications.id"), nullable=False)

    document_type = Column(String(100), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=True)
    sha256_hash = Column(String(128), nullable=True)

    verification_status = Column(String(60), default="UPLOADED")
    quality_score = Column(Float, default=60)

    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("AccountApplication", back_populates="documents")


class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), unique=True, index=True, nullable=False)
    city = Column(String(100), nullable=True)
    country = Column(String(100), default="Cameroun")
    active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Nationality(Base):
    __tablename__ = "nationalities"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True, nullable=False)
    label = Column(String(120), unique=True, index=True, nullable=False)
    active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True, index=True)
    iso_code = Column(String(5), unique=True, index=True, nullable=False)
    flag = Column(String(10), nullable=True)
    name_fr = Column(String(120), nullable=False)
    calling_code = Column(String(20), nullable=False)
    active = Column(Boolean, default=True)
    display_order = Column(Integer, default=1000)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)