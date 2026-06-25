import re
import unicodedata

from sqlalchemy.orm import Session

from app.models import Agency


DEFAULT_AGENCIES = [
    "FIRST BANK AGENCE MOBILE",
    "FIRST BANK AHALA",
    "FIRST BANK AKWA",
    "FIRST BANK AKWA MILLENIUM",
    "FIRST BANK AWAE",
    "FIRST BANK BAFANG",
    "FIRST BANK BAFIA",
    "FIRST BANK BAMENDA",
    "FIRST BANK BAMENDA-NKWEN",
    "FIRST BANK BAMENDZI",
    "FIRST BANK BASTOS",
    "FIRST BANK BATOURI",
    "FIRST BANK BEKOKO",
    "FIRST BANK BERTOUA",
    "FIRST BANK BESSENGUE",
    "FIRST BANK BIYEM-ASSI",
    "FIRST BANK BIYEM-ASSI CARREFOUR",
    "FIRST BANK BONABERI",
    "FIRST BANK BONABERI II",
    "FIRST BANK BONAMOUSSADI",
    "FIRST BANK BONANDJO",
    "FIRST BANK BONAPRIOSO",
    "FIRST BANK BONASSAMA",
    "FIRST BANK BUEA",
    "FIRST BANK CAMAIR",
    "FIRST BANK CITES DES PALMIERS",
    "FIRST BANK COTE D’IVOIRE",
    "FIRST BANK CTX CENTRE-SUD-NORD",
    "FIRST BANK CTX LITTORAL-OUEST",
    "FIRST BANK DAKAR",
    "FIRST BANK DAMAS",
    "FIRST BANK DOUCHE MUNICIPALE",
    "FIRST BANK DSCHANG",
    "FIRST BANK EBOLOWA",
    "FIRST BANK EDEA",
    "FIRST BANK ESSOS",
    "FIRST BANK ETOUDI",
    "FIRST BANK FENETRE ISLAMIC",
    "FIRST BANK FOUNBOT",
    "FIRST BANK GAROUA",
    "FIRST BANK GAROUA-BOULAI",
    "FIRST BANK HIPPODROME",
    "FIRST BANK KOTTO-BANGUE",
    "FIRST BANK KOUMASSI",
    "FIRST BANK KOUSSIRI",
    "FIRST BANK KRIBI",
    "FIRST BANK KUMBA",
    "FIRST BANK LIMBE",
    "FIRST BANK LOGBABA",
    "FIRST BANK LOGBOM",
    "FIRST BANK LOUM",
    "FIRST BANK MABANDA",
    "FIRST BANK MAKEPE",
    "FIRST BANK MARCHE CENTRAL",
    "FIRST BANK MAROUA",
    "FIRST BANK MAROUA II",
    "FIRST BANK MBALGONG",
    "FIRST BANK MBALLA II",
    "FIRST BANK MBALMAYO",
    "FIRST BANK MBOPPI",
    "FIRST BANK MBOUDA",
    "FIRST BANK MEIGANGA",
    "FIRST BANK MELEN",
    "FIRST BANK MENDONG",
    "FIRST BANK MESSA",
    "FIRST BANK MESSAMENDONGO",
    "FIRST BANK MFOU",
    "FIRST BANK MFOUNDI",
    "FIRST BANK MINBOMAN",
    "FIRST BANK MOKOLO",
    "FIRST BANK MVAN",
    "FIRST BANK MVOG-MBI",
    "FIRST BANK NDOG-PASSI",
    "FIRST BANK NDOKOTTI",
    "FIRST BANK NEWBELL",
    "FIRST BANK NGAOUNDERE",
    "FIRST BANK NKOUABANG",
    "FIRST BANK NKOLBISSON",
    "FIRST BANK NKOLBONG",
    "FIRST BANK NKONGSAMBA",
    "FIRST BANK NKOULOULOUN",
    "FIRST BANK OBALA",
    "FIRST BANK OLEMBE",
    "FIRST BANK OMNISPORT",
    "FIRST BANK PK 14",
    "FIRST BANK PORT AUTONOME DOUALA",
    "FIRST BANK PORT DE KRIBI",
    "FIRST BANK PROMOTE",
    "FIRST BANK RDC",
    "FIRST BANK RETRAITE",
    "FIRST BANK ROUMBE ADJIA",
    "FIRST BANK SAINT MICHEL",
    "FIRST BANK SANGMELIMA",
    "FIRST BANK SAO TOME",
    "FIRST BANK SHELL NEWBELL",
    "FIRST BANK TAMDJA",
    "FIRST BANK YADEME",
    "FIRST BANK YASSA",
]


def normalize_code(name: str) -> str:
    text = name.upper().replace("FIRST BANK", "").strip()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^A-Z0-9]+", "_", text)
    text = text.strip("_")

    if not text:
        text = "AGENCE"

    return text[:45]


def seed_agencies(db: Session):
    for agency_name in DEFAULT_AGENCIES:
        clean_name = " ".join(agency_name.strip().split())

        existing = db.query(Agency).filter(Agency.name == clean_name).first()
        if existing:
            continue

        base_code = normalize_code(clean_name)
        code = base_code
        counter = 1

        while db.query(Agency).filter(Agency.code == code).first():
            counter += 1
            code = f"{base_code}_{counter}"

        agency = Agency(
            code=code,
            name=clean_name,
            city=None,
            country="Cameroun",
            active=True
        )

        db.add(agency)

    db.commit()