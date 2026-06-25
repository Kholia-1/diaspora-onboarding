from sqlalchemy.orm import Session

from app.models import Nationality


DEFAULT_NATIONALITIES = [
    {"code": "CM", "label": "Camerounaise"},
    {"code": "FR", "label": "Française"},
    {"code": "BE", "label": "Belge"},
    {"code": "CA", "label": "Canadienne"},
    {"code": "US", "label": "Américaine"},
    {"code": "GB", "label": "Britannique"},
    {"code": "DE", "label": "Allemande"},
    {"code": "IT", "label": "Italienne"},
    {"code": "ES", "label": "Espagnole"},
    {"code": "CH", "label": "Suisse"},
    {"code": "CI", "label": "Ivoirienne"},
    {"code": "SN", "label": "Sénégalaise"},
    {"code": "GA", "label": "Gabonaise"},
    {"code": "CG", "label": "Congolaise"},
    {"code": "CD", "label": "Congolaise RDC"},
    {"code": "TD", "label": "Tchadienne"},
    {"code": "CF", "label": "Centrafricaine"},
    {"code": "GQ", "label": "Équato-guinéenne"},
    {"code": "NG", "label": "Nigériane"},
    {"code": "BJ", "label": "Béninoise"},
    {"code": "TG", "label": "Togolaise"},
    {"code": "GH", "label": "Ghanéenne"},
    {"code": "ML", "label": "Malienne"},
    {"code": "BF", "label": "Burkinabè"},
    {"code": "NE", "label": "Nigérienne"},
    {"code": "MA", "label": "Marocaine"},
    {"code": "DZ", "label": "Algérienne"},
    {"code": "TN", "label": "Tunisienne"},
    {"code": "EG", "label": "Égyptienne"},
    {"code": "ZA", "label": "Sud-africaine"},
    {"code": "CN", "label": "Chinoise"},
    {"code": "IN", "label": "Indienne"},
    {"code": "TR", "label": "Turque"},
    {"code": "BR", "label": "Brésilienne"},
    {"code": "OTHER", "label": "Autre"}
]


def seed_nationalities(db: Session):
    for item in DEFAULT_NATIONALITIES:
        existing = db.query(Nationality).filter(
            Nationality.code == item["code"]
        ).first()

        if existing:
            continue

        nationality = Nationality(
            code=item["code"],
            label=item["label"],
            active=True
        )

        db.add(nationality)

    db.commit()