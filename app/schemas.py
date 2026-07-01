from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


class ApplicationCreate(BaseModel):
    pre_onboarding_session_id: Optional[str] = None
    last_name: str
    first_name: str
    birth_date: Optional[date] = None
    birth_place: Optional[str] = None
    birth_department: Optional[str] = None
    birth_name: Optional[str] = None
    residency_status: Optional[str] = "RESIDENT"

    address_location: Optional[str] = None
    postal_box: Optional[str] = None
    phone: Optional[str] = None
    email: EmailStr

    contact_person_1_name: Optional[str] = None
    contact_person_1_phone: Optional[str] = None
    contact_person_2_name: Optional[str] = None
    contact_person_2_phone: Optional[str] = None

    father_name: Optional[str] = None
    mother_name: Optional[str] = None

    nationality: Optional[str] = None
    residence: Optional[str] = None

    sex: Optional[str] = None
    marital_status: Optional[str] = None
    matrimonial_regime: Optional[str] = None

    identity_document_number: Optional[str] = None
    identity_document_issue_date: Optional[date] = None
    identity_document_issue_place: Optional[str] = None

    rib: Optional[str] = None
    income_range: Optional[str] = None
    income_currency: Optional[str] = None
    activity_sector: Optional[str] = None
    activity_sector_code: Optional[str] = None
    activity_subsector: Optional[str] = None
    activity_subsector_code: Optional[str] = None
    sector_of_activity: Optional[str] = None
    economic_sector: Optional[str] = None

    account_object: Optional[str] = None
    account_object_other: Optional[str] = None

    funds_origin: Optional[str] = None
    funds_origin_other: Optional[str] = None

    account_type: Optional[str] = None
    preferred_branch: Optional[str] = None

    selected_package_code: str | None = None
    selected_package_name: str | None = None
    selected_package_currency: str | None = None
    selected_package_opening_fee: float | None = 0
    selected_package_subscription_fee: float | None = 0
    selected_package_monthly_fee: float | None = 0
    selected_package_payment_required: bool | None = False
    account_purpose: Optional[str] = None

    is_pep: bool = False
    pep_details: Optional[str] = None


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str

    last_name: str
    first_name: str
    birth_date: Optional[date] = None
    birth_place: Optional[str] = None
    birth_department: Optional[str] = None

    address_location: Optional[str] = None
    postal_box: Optional[str] = None
    phone: Optional[str] = None
    email: str

    contact_person_1_name: Optional[str] = None
    contact_person_1_phone: Optional[str] = None
    contact_person_2_name: Optional[str] = None
    contact_person_2_phone: Optional[str] = None

    father_name: Optional[str] = None
    mother_name: Optional[str] = None

    nationality: Optional[str] = None
    residence: Optional[str] = None

    sex: Optional[str] = None
    marital_status: Optional[str] = None
    matrimonial_regime: Optional[str] = None

    identity_document_number: Optional[str] = None
    identity_document_issue_date: Optional[date] = None
    identity_document_issue_place: Optional[str] = None

    account_type: Optional[str] = None
    preferred_branch: Optional[str] = None
    account_purpose: Optional[str] = None

    is_pep: bool
    pep_details: Optional[str] = None

    status: str
    risk_level: str

    kyc_score: float
    document_score: float

    blackmodule_status: str
    blackmodule_score: float
    blackmodule_alert: Optional[str] = None

    created_at: datetime


class BackOfficeDecision(BaseModel):
    decision: str
    reviewed_by: str
    comment: Optional[str] = None
    client_message: Optional[str] = None
    final_rib: Optional[str] = None
    account_number: Optional[str] = None


class AgencyCreate(BaseModel):
    code: str
    name: str
    city: Optional[str] = None
    country: Optional[str] = "Cameroun"
    active: bool = True


class AgencyUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    active: Optional[bool] = None


class AgencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    active: bool

class NationalityCreate(BaseModel):
    code: str
    label: str
    active: bool = True


class NationalityUpdate(BaseModel):
    code: Optional[str] = None
    label: Optional[str] = None
    active: Optional[bool] = None


class NationalityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    label: str
    active: bool

class CountryCreate(BaseModel):
    iso_code: str
    flag: Optional[str] = None
    name_fr: str
    calling_code: str
    active: bool = True
    display_order: int = 1000


class CountryUpdate(BaseModel):
    iso_code: Optional[str] = None
    flag: Optional[str] = None
    name_fr: Optional[str] = None
    calling_code: Optional[str] = None
    active: Optional[bool] = None
    display_order: Optional[int] = None


class CountryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    iso_code: str
    flag: Optional[str] = None
    name_fr: str
    calling_code: str
    active: bool
    display_order: int
