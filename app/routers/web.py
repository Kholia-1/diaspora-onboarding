from app.models import AccountApplication
from app.database import get_db, SessionLocal
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi import Depends
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates


router = APIRouter(tags=["Interface Web"])

templates = Jinja2Templates(directory="app/templates")


# BACKOFFICE_PAGE_GUARD_V1 — les pages back-office exigent une session valide
def _backoffice_user_or_none(request: Request):
    from app.services.backoffice_auth_service import get_user_from_request

    db = SessionLocal()
    try:
        return get_user_from_request(request, db)
    finally:
        db.close()


def _require_backoffice_page(request: Request):
    """Renvoie une redirection vers /backoffice/login si non authentifié, sinon None."""
    if _backoffice_user_or_none(request) is None:
        return RedirectResponse(url="/backoffice/login", status_code=303)
    return None


# BACKOFFICE_PAGE_USER_CONTEXT_V1 — expose l'utilisateur de session aux templates
def _backoffice_page_or_redirect(request: Request):
    """Renvoie (redirect, user) : redirection vers le login si non authentifié."""
    user = _backoffice_user_or_none(request)
    if user is None:
        return RedirectResponse(url="/backoffice/login", status_code=303), None
    return None, user


@router.get("/backoffice/login")
def backoffice_login_page(request: Request):
    if _backoffice_user_or_none(request) is not None:
        return RedirectResponse(url="/backoffice/applications", status_code=303)

    return templates.TemplateResponse(
        request,
        "backoffice_login.html"
    )


@router.get("/backoffice/logout")
def backoffice_logout_page(request: Request):
    from app.services.backoffice_auth_service import SESSION_COOKIE_NAME, delete_session

    token = request.cookies.get(SESSION_COOKIE_NAME)

    if token:
        db = SessionLocal()
        try:
            delete_session(db, token)
        finally:
            db.close()

    response = RedirectResponse(url="/backoffice/login", status_code=303)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return response


@router.get("/")
async def portal_home_page(request: Request):
    return templates.TemplateResponse(request, "portal_home.html", {"request": request})


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import FileResponse
    return FileResponse("app/static/afriland-logo.png", media_type="image/png")


@router.get("/client/open-account")
def client_open_account(request: Request):
    return templates.TemplateResponse(
        request,
        "client_open_account_flow_test.html"
    )


@router.get("/backoffice/applications")
def backoffice_applications(request: Request):
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

    return templates.TemplateResponse(
        request,
        "backoffice_applications.html",
        {"backoffice_user": user}
    )


@router.get("/backoffice/applications/{application_id}")
def backoffice_application_detail(request: Request, application_id: str, db: Session = Depends(get_db)):
    """
    Affiche le détail d'un dossier back-office.
    Accepte soit l'ID numérique interne, soit la référence publique DIA-...
    """
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

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

    # Le template rend les champs OTP WhatsApp côté serveur via l'ORM
    application = None
    if raw.isdigit():
        application = db.query(AccountApplication).filter(
            AccountApplication.id == int(raw)
        ).first()

    return templates.TemplateResponse(
        request,
        "backoffice_detail.html",
        {
            "request": request,
            "application_id": raw,
            "application": application,
            "backoffice_user": user
        }
    )


@router.get("/backoffice/agencies")
def backoffice_agencies(request: Request):
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

    return templates.TemplateResponse(
        request,
        "backoffice_agencies.html",
        {"backoffice_user": user}
    )


# BACKOFFICE_AUDIT_LOGS_PAGE_V1
@router.get("/backoffice/audit-logs")
def backoffice_audit_logs(request: Request):
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

    return templates.TemplateResponse(
        request,
        "backoffice_audit_logs.html",
        {"backoffice_user": user}
    )

@router.get("/backoffice/nationalities")
def backoffice_nationalities(request: Request):
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

    return templates.TemplateResponse(
        request,
        "backoffice_nationalities.html",
        {"backoffice_user": user}
    )

# BACKOFFICE_USERS_PAGE_V1 — gestion des utilisateurs et rôles (réservée ADMIN)
@router.get("/backoffice/users")
def backoffice_users_page(request: Request):
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

    if user.role != "ADMIN":
        return RedirectResponse(url="/backoffice/applications", status_code=303)

    return templates.TemplateResponse(
        request,
        "backoffice_users.html",
        {"backoffice_user": user}
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
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

    return templates.TemplateResponse(
        request,
        "backoffice_packages.html",
        {"request": request, "backoffice_user": user}
    )


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


# BACKOFFICE_API_INTEGRATIONS_PAGE_JINJA_V6 — le template étend backoffice_base.html
@router.get("/backoffice/api-integrations")
def backoffice_api_integrations_page(request: Request):
    redirect, user = _backoffice_page_or_redirect(request)
    if redirect:
        return redirect

    return templates.TemplateResponse(
        request,
        "backoffice_api_integrations.html",
        {"request": request, "backoffice_user": user}
    )

