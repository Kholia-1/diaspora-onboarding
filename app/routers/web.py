from app.models import AccountApplication
from app.database import get_db
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi import Depends
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates


router = APIRouter(tags=["Interface Web"])

templates = Jinja2Templates(directory="app/templates")


@router.get("/")
async def portal_home_page(request: Request):
    return templates.TemplateResponse(request, "portal_home.html", {"request": request})

@router.get("/client/open-account")
def client_open_account(request: Request):
    return templates.TemplateResponse(
        request,
        "client_open_account_flow_test.html"
    )


@router.get("/backoffice/applications")
def backoffice_applications(request: Request):
    return templates.TemplateResponse(
        request,
        "backoffice_applications.html"
    )


@router.get("/backoffice/applications/{application_id}")
def backoffice_application_detail(request: Request, application_id: str, db: Session = Depends(get_db)):
    """
    Affiche le détail d'un dossier back-office.
    Accepte soit l'ID numérique interne, soit la référence publique DIA-...
    """
    raw = str(application_id or "").strip()

    # Si l'URL contient une référence DIA-..., on retrouve l'ID interne
    # puis on redirige vers l'URL numérique utilisée par le JavaScript existant.
    if raw and not raw.isdigit():
        found = None

        for column in AccountApplication.__table__.columns:
            if column.name == "id":
                continue

            try:
                if column.type.python_type is not str:
                    continue
            except Exception:
                continue

            model_column = getattr(AccountApplication, column.name, None)
            if model_column is None:
                continue

            found = db.query(AccountApplication).filter(model_column == raw).first()
            if found:
                break

        if found:
            return RedirectResponse(
                url=f"/backoffice/applications/{found.id}",
                status_code=303
            )

    return templates.TemplateResponse(
        request,
        "backoffice_detail.html",
        {
            "request": request,
            "application_id": raw
        }
    )


@router.get("/backoffice/agencies")
def backoffice_agencies(request: Request):
    return templates.TemplateResponse(
        request,
        "backoffice_agencies.html"
    )

@router.get("/backoffice/nationalities")
def backoffice_nationalities(request: Request):
    return templates.TemplateResponse(
        request,
        "backoffice_nationalities.html"
    )

@router.get("/client/status")
def client_status(request: Request):
    return templates.TemplateResponse(
        request,
        "client_status.html"
    )

@router.get("/open-account")
async def open_account_page(request: Request):
    return templates.TemplateResponse(request, "client_open_account_flow_test.html", {"request": request})

@router.get("/service-unavailable")
async def service_unavailable_page(request: Request):
    return templates.TemplateResponse(request, "service_unavailable.html", {"request": request})


@router.get("/backoffice/packages")
async def backoffice_packages_page(request: Request):
    return templates.TemplateResponse(request, "backoffice_packages.html", {"request": request})


@router.get("/open-account-test")
async def open_account_test_page(request: Request):
    return templates.TemplateResponse(request, "client_open_account_flow_test.html", {"request": request})

@router.get("/api/sectors/active")
async def get_active_activity_sectors():
    from pathlib import Path
    import json

    sectors_file = Path("data/bank_sectors.json")

    if not sectors_file.exists():
        return []

    try:
        sectors = json.loads(sectors_file.read_text(encoding="utf-8"))
    except Exception:
        return []

    clean = []
    for item in sectors:
        if not isinstance(item, dict):
            continue

        code = str(item.get("code", "")).strip()
        name = str(item.get("name", "")).strip()

        if code and name:
            clean.append({
                "code": code,
                "name": name
            })

    return clean


@router.get("/open-account-flow-test")
async def open_account_flow_test_page(request: Request):
    return templates.TemplateResponse(request, "client_open_account_flow_test.html", {"request": request})

# Services cartes - pages client démonstration
@router.get("/souscrire-carte")
async def card_subscription_page(request: Request):
    return templates.TemplateResponse(request, "client_card_subscription.html", {"request": request})


@router.get("/recharger-carte")
async def card_reload_page(request: Request):
    return templates.TemplateResponse(request, "client_card_reload.html", {"request": request})


@router.get("/backoffice/api-integrations")
def backoffice_api_integrations_page(request: Request):
    return templates.TemplateResponse(request, "backoffice_api_integrations.html")


