# BACKOFFICE_USERS_ROUTER_V1 — gestion des utilisateurs et des rôles (réservé ADMIN)
import re

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BackofficeUser, BackofficeSession
from app.services.audit_service import log_action
from app.services.backoffice_auth_service import (
    BACKOFFICE_ROLES,
    hash_password,
    require_backoffice_user,
)

router = APIRouter(
    prefix="/api/backoffice/users",
    tags=["Back Office - Utilisateurs et rôles"]
)

USERNAME_PATTERN = re.compile(r"^[a-z0-9._-]{3,80}$")
PASSWORD_MIN_LENGTH = 8


def _require_admin(request: Request, db: Session) -> BackofficeUser:
    return require_backoffice_user(request, db, roles={"ADMIN"})


def _user_payload(user: BackofficeUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "role_label": BACKOFFICE_ROLES.get(user.role, user.role),
        "active": bool(user.active),
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
    }


def _validate_role(role: str) -> str:
    role_clean = str(role or "").strip().upper()

    if role_clean not in BACKOFFICE_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Rôle invalide. Rôles autorisés : " + ", ".join(BACKOFFICE_ROLES) + "."
        )

    return role_clean


def _validate_password(password: str) -> str:
    password = str(password or "")

    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Le mot de passe doit contenir au moins {PASSWORD_MIN_LENGTH} caractères."
        )

    return password


def _count_other_active_admins(db: Session, user_id: int) -> int:
    return (
        db.query(BackofficeUser)
        .filter(
            BackofficeUser.role == "ADMIN",
            BackofficeUser.active == True,  # noqa: E712
            BackofficeUser.id != user_id,
        )
        .count()
    )


@router.get("/roles")
def list_roles(request: Request, db: Session = Depends(get_db)):
    _require_admin(request, db)

    return {
        "roles": [
            {"code": code, "label": label}
            for code, label in BACKOFFICE_ROLES.items()
        ]
    }


@router.get("")
def list_users(request: Request, db: Session = Depends(get_db)):
    _require_admin(request, db)

    users = db.query(BackofficeUser).order_by(BackofficeUser.username.asc()).all()

    return {
        "count": len(users),
        "users": [_user_payload(user) for user in users],
    }


@router.post("")
def create_user(
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    admin = _require_admin(request, db)

    username = str(payload.get("username") or "").strip().lower()
    full_name = str(payload.get("full_name") or "").strip() or None
    role = _validate_role(payload.get("role"))
    password = _validate_password(payload.get("password"))

    if not USERNAME_PATTERN.match(username):
        raise HTTPException(
            status_code=400,
            detail="Identifiant invalide : 3 à 80 caractères (lettres minuscules, chiffres, . _ -)."
        )

    if db.query(BackofficeUser).filter(BackofficeUser.username == username).first():
        raise HTTPException(status_code=409, detail="Cet identifiant existe déjà.")

    user = BackofficeUser(
        username=username,
        full_name=full_name,
        password_hash=hash_password(password),
        role=role,
        active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    log_action(
        db,
        action="BACKOFFICE_USER_CREATED",
        actor=admin.username,
        resource_type="BackofficeUser",
        resource_id=user.id,
        details=f"username={username}, role={role}",
        request=request,
    )

    return {"ok": True, "user": _user_payload(user)}


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    request: Request,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    admin = _require_admin(request, db)

    user = db.query(BackofficeUser).filter(BackofficeUser.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    changes = []

    if "full_name" in payload:
        user.full_name = str(payload.get("full_name") or "").strip() or None
        changes.append("full_name")

    if "role" in payload:
        new_role = _validate_role(payload.get("role"))

        # On ne retire pas le rôle ADMIN au dernier administrateur actif.
        if user.role == "ADMIN" and new_role != "ADMIN" and user.active:
            if _count_other_active_admins(db, user.id) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Impossible : ce compte est le dernier administrateur actif."
                )

        user.role = new_role
        changes.append(f"role={new_role}")

    if "active" in payload:
        new_active = bool(payload.get("active"))

        if not new_active:
            if user.id == admin.id:
                raise HTTPException(
                    status_code=400,
                    detail="Vous ne pouvez pas désactiver votre propre compte."
                )

            if user.role == "ADMIN" and _count_other_active_admins(db, user.id) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Impossible : ce compte est le dernier administrateur actif."
                )

            # La désactivation ferme les sessions ouvertes de l'utilisateur.
            db.query(BackofficeSession).filter(BackofficeSession.user_id == user.id).delete()

        user.active = new_active
        changes.append(f"active={new_active}")

    if "password" in payload:
        user.password_hash = hash_password(_validate_password(payload.get("password")))
        # Le changement de mot de passe invalide les sessions existantes (sauf pour soi-même).
        if user.id != admin.id:
            db.query(BackofficeSession).filter(BackofficeSession.user_id == user.id).delete()
        changes.append("password")

    if not changes:
        raise HTTPException(status_code=400, detail="Aucune modification fournie.")

    db.commit()
    db.refresh(user)

    log_action(
        db,
        action="BACKOFFICE_USER_UPDATED",
        actor=admin.username,
        resource_type="BackofficeUser",
        resource_id=user.id,
        details=f"username={user.username}, changements : " + ", ".join(changes),
        request=request,
    )

    return {"ok": True, "user": _user_payload(user)}
