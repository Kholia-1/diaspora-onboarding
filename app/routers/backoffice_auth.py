# BACKOFFICE_AUTH_ROUTER_V1 — connexion / déconnexion des utilisateurs back-office
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BackofficeUser
from app.services.audit_service import log_action
from app.services.backoffice_auth_service import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_HOURS,
    create_session,
    delete_session,
    get_user_from_request,
    verify_password,
)

router = APIRouter(
    prefix="/api/backoffice/auth",
    tags=["Back Office - Authentification"]
)


@router.post("/login")
def backoffice_login(
    request: Request,
    response: Response,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    username = str(payload.get("username") or "").strip().lower()
    password = str(payload.get("password") or "")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Identifiant et mot de passe requis.")

    user = db.query(BackofficeUser).filter(BackofficeUser.username == username).first()

    if not user or not user.active or not verify_password(password, user.password_hash):
        log_action(
            db,
            action="LOGIN_FAILED",
            actor=username,
            resource_type="BackofficeUser",
            request=request,
        )
        raise HTTPException(status_code=401, detail="Identifiants incorrects.")

    token = create_session(db, user)

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )

    log_action(
        db,
        action="LOGIN_SUCCESS",
        actor=user.username,
        resource_type="BackofficeUser",
        resource_id=user.id,
        request=request,
    )

    return {
        "ok": True,
        "user": {
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/logout")
def backoffice_logout(request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    token = request.cookies.get(SESSION_COOKIE_NAME)

    if token:
        delete_session(db, token)

    response.delete_cookie(SESSION_COOKIE_NAME, path="/")

    if user:
        log_action(
            db,
            action="LOGOUT",
            actor=user.username,
            resource_type="BackofficeUser",
            resource_id=user.id,
            request=request,
        )

    return {"ok": True}


@router.get("/me")
def backoffice_me(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)

    if not user:
        raise HTTPException(status_code=401, detail="Non authentifié.")

    return {
        "ok": True,
        "user": {
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
        },
    }
