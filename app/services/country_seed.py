import phonenumbers
from babel import Locale
from sqlalchemy.orm import Session

from app.models import Country


PRIORITY_COUNTRIES = [
    "CM", "FR", "CA", "US", "BE", "CH", "GB",
    "CI", "SN", "GA", "CG", "CD", "TD", "CF", "GQ",
    "NG", "BJ", "TG", "GH", "ML", "BF", "NE", "MA",
    "DZ", "TN", "EG", "ZA", "CN", "AE", "SA"
]


def iso_to_flag(iso_code: str) -> str:
    """
    Convertit CM en 🇨🇲, FR en 🇫🇷, etc.
    """
    iso_code = iso_code.upper()

    if len(iso_code) != 2 or not iso_code.isalpha():
        return ""

    return "".join(chr(127397 + ord(letter)) for letter in iso_code)


def get_display_order(iso_code: str) -> int:
    if iso_code in PRIORITY_COUNTRIES:
        return PRIORITY_COUNTRIES.index(iso_code) + 1

    return 1000


def seed_countries(db: Session):
    locale = Locale.parse("fr")
    territories = locale.territories

    for iso_code in sorted(phonenumbers.SUPPORTED_REGIONS):
        if len(iso_code) != 2 or not iso_code.isalpha():
            continue

        existing = db.query(Country).filter(
            Country.iso_code == iso_code
        ).first()

        if existing:
            continue

        country_code = phonenumbers.country_code_for_region(iso_code)

        if not country_code:
            continue

        name_fr = territories.get(iso_code, iso_code)
        flag = iso_to_flag(iso_code)

        country = Country(
            iso_code=iso_code,
            flag=flag,
            name_fr=name_fr,
            calling_code=f"+{country_code}",
            active=True,
            display_order=get_display_order(iso_code)
        )

        db.add(country)

    db.commit()