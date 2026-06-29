from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
load_dotenv()

from app.database import Base, engine, SessionLocal
from app.routers import applications, backoffice, web, agencies, nationalities, countries, pre_onboarding
from app.services.agency_seed import seed_agencies
from app.services.nationality_seed import seed_nationalities
from app.services.country_seed import seed_countries
from app.services.schema_migration import migrate_account_applications


Base.metadata.create_all(bind=engine)
migrate_account_applications(engine)

db = SessionLocal()
try:
    seed_agencies(db)
    seed_nationalities(db)
    seed_countries(db)
finally:
    db.close()

app = FastAPI(
    title="First Diaspora Onboarding API",
    description="Plateforme d'ouverture de compte à distance pour la diaspora avec formulaire KYC, photos documents et intégration BLACKMODULE.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(web.router)
app.include_router(applications.router)
app.include_router(backoffice.router)
app.include_router(agencies.router)
app.include_router(nationalities.router)
app.include_router(countries.router)


@app.get("/health")
def health():
    return {
        "status": "UP",
        "application": "First Diaspora Onboarding"
    }

app.include_router(pre_onboarding.router)

# WhatsApp Callbell router
from app.routers import whatsapp as whatsapp_router
app.include_router(whatsapp_router.router)

# Sous-secteurs d'activité router
from app.routers import subsectors as subsectors_router
app.include_router(subsectors_router.router)

