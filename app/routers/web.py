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
        "client_open_account.html"
    )


@router.get("/backoffice/applications")
def backoffice_applications(request: Request):
    return templates.TemplateResponse(
        request,
        "backoffice_applications.html"
    )


@router.get("/backoffice/applications/{application_id}")
def backoffice_application_detail(request: Request, application_id: int):
    return templates.TemplateResponse(
        request,
        "backoffice_detail.html",
        {
            "application_id": application_id
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
    return templates.TemplateResponse(request, "client_open_account.html", {"request": request})

@router.get("/service-unavailable")
async def service_unavailable_page(request: Request):
    return templates.TemplateResponse(request, "service_unavailable.html", {"request": request})


@router.get("/")
async def portal_home_page(request: Request):
    return templates.TemplateResponse(request, "portal_home.html", {"request": request})


@router.get("/client/open-account")
async def client_open_account_page(request: Request):
    return templates.TemplateResponse(request, "client_open_account.html", {"request": request})


@router.get("/backoffice/packages")
async def backoffice_packages_page(request: Request):
    return templates.TemplateResponse(request, "backoffice_packages.html", {"request": request})


@router.get("/open-account-test")
async def open_account_test_page(request: Request):
    return templates.TemplateResponse(request, "client_open_account_manager.html", {"request": request})

