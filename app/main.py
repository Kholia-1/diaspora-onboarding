from app.routers import mastercard_gateway
from app.routers import client_account_status
from app.routers import account_opening
from app.routers import whatsapp_notifications
from app.routers import api_integration_tests
from app.routers import payments
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
load_dotenv()

from app.database import Base, engine, SessionLocal
from app.routers import applications, backoffice, backoffice_auth, backoffice_users, web, agencies, nationalities, countries, pre_onboarding
from app.services.agency_seed import seed_agencies
from app.services.nationality_seed import seed_nationalities
from app.services.country_seed import seed_countries
from app.services.backoffice_auth_service import seed_backoffice_admin
from app.services.schema_migration import migrate_account_applications


Base.metadata.create_all(bind=engine)
migrate_account_applications(engine)

db = SessionLocal()
try:
    seed_agencies(db)
    seed_nationalities(db)
    seed_countries(db)
    seed_backoffice_admin(db)
except Exception:
    # Avec plusieurs workers, deux process peuvent démarrer en même temps et
    # entrer en collision sur les contraintes uniques : sans gravité, l'un des
    # deux a déjà inséré les données.
    db.rollback()
finally:
    db.close()

app = FastAPI(

title="First Diaspora Onboarding API",
    description="Plateforme d'ouverture de compte à distance pour la diaspora avec formulaire KYC, photos documents et intégration BLACKMODULE.",
    version="1.0.0"
)

# AFB_GZIP_RESPONSES_V1 : les pages client font ~600 Ko de HTML inline ;
# sans compression, le chargement mobile est sensiblement ralenti.
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1024)


# AFB_STATIC_CACHE_V1 : les assets statiques sont référencés avec ?v=<hash>
# (cache-busting) ; le navigateur peut donc les garder en cache sans revalider.
@app.middleware("http")
async def static_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers.setdefault("Cache-Control", "public, max-age=86400")
    return response

# FORCE_REDIRECT_OLD_OPEN_ACCOUNT_ROUTES_TO_TEST_V1
@app.middleware("http")
async def force_redirect_old_open_account_routes(request, call_next):
    """
    Redirige les anciennes routes client vers la page officielle temporaire.
    """
    if request.url.path in ["/client/open-account", "/open-account"]:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/open-account-test", status_code=302)

    return await call_next(request)


# FORCE_HTTPS_BEHIND_TUNNEL_V1
@app.middleware("http")
async def force_https_behind_tunnel(request, call_next):
    """
    L'accès caméra (getUserMedia) exige un contexte sécurisé : si la page
    arrive en HTTP via le tunnel Cloudflare (X-Forwarded-Proto), on redirige
    vers HTTPS. Sans effet en local (l'en-tête est absent).
    """
    if request.headers.get("x-forwarded-proto", "").lower() == "http":
        from fastapi.responses import RedirectResponse
        return RedirectResponse(
            url=str(request.url.replace(scheme="https")), status_code=308
        )

    return await call_next(request)



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compresse les réponses (les templates HTML font plusieurs centaines de Ko)
app.add_middleware(GZipMiddleware, minimum_size=1000)

class CachedStaticFiles(StaticFiles):
    """Ajoute un Cache-Control long sur les assets statiques (logos, libs vendor)."""

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=604800"
        return response


app.mount("/static", CachedStaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(payments.router)
app.include_router(mastercard_gateway.router)
app.include_router(client_account_status.router)
app.include_router(account_opening.router)
app.include_router(whatsapp_notifications.router)
app.include_router(api_integration_tests.router)
app.include_router(web.router)
app.include_router(applications.router)
app.include_router(backoffice_auth.router)
app.include_router(backoffice_users.router)
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

# PUBLIC_MASTERCARD_PAYMENTS_ROUTES_V1
from app.routers.mastercard_payments_public import router as mastercard_payments_public_router
app.include_router(mastercard_payments_public_router)


# PAYMENT_DIAGNOSTICS_ROUTER_V1
from app.routers.payment_diagnostics import router as payment_diagnostics_router
app.include_router(payment_diagnostics_router)


# CLIENT_PAYMENT_LINK_ROUTER_V1
from app.routers.client_payment_link import router as client_payment_link_router
app.include_router(client_payment_link_router)


# BACKOFFICE_PAYMENT_LINK_ROUTER_V1
from app.routers.backoffice_payment_link import router as backoffice_payment_link_router
app.include_router(backoffice_payment_link_router)

# AFB_MASTERCARD_MANUAL_VERIFY_ROUTER_V1
from app.routers.mastercard_manual_verify import router as mastercard_manual_verify_router
app.include_router(mastercard_manual_verify_router)

