# BACKOFFICE_AUTH_SERVICE_V1 — authentification par session des utilisateurs back-office
import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import BackofficeUser, BackofficeSession

SESSION_COOKIE_NAME = "bo_session"
SESSION_TTL_HOURS = int(os.getenv("BACKOFFICE_SESSION_TTL_HOURS", "12"))
PBKDF2_ITERATIONS = 200_000


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return secrets.compare_digest(hash_password(password, salt), stored)


def create_session(db: Session, user: BackofficeUser) -> str:
    token = secrets.token_urlsafe(48)

    session = BackofficeSession(
        token=token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS),
    )

    user.last_login_at = datetime.utcnow()
    db.add(session)
    db.commit()

    return token


def delete_session(db: Session, token: str) -> None:
    db.query(BackofficeSession).filter(BackofficeSession.token == token).delete()
    db.commit()


def get_user_from_request(request: Request, db: Session) -> Optional[BackofficeUser]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    session = (
        db.query(BackofficeSession)
        .filter(BackofficeSession.token == token)
        .first()
    )

    if not session:
        return None

    if session.expires_at < datetime.utcnow():
        db.delete(session)
        db.commit()
        return None

    user = db.query(BackofficeUser).filter(BackofficeUser.id == session.user_id).first()

    if not user or not user.active:
        return None

    return user


def seed_backoffice_admin(db: Session) -> None:
    """Crée le compte administrateur initial si aucun utilisateur n'existe."""
    if db.query(BackofficeUser).count() > 0:
        return

    password = os.getenv("BACKOFFICE_ADMIN_PASSWORD", "Admin@2026")

    admin = BackofficeUser(
        username="admin",
        full_name="Administrateur",
        password_hash=hash_password(password),
        role="ADMIN",
        active=True,
    )

    db.add(admin)
    db.commit()

    print(
        "[BACKOFFICE AUTH] Compte initial créé : utilisateur 'admin' "
        "(mot de passe défini par BACKOFFICE_ADMIN_PASSWORD, sinon valeur par défaut de développement)."
    )
