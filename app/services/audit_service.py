# AUDIT_SERVICE_V1 — journal des actions des utilisateurs
import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog


def log_action(
    db: Session,
    action: str,
    actor: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[Any] = None,
    details: Optional[Any] = None,
    request: Optional[Request] = None,
) -> None:
    """Enregistre une action utilisateur dans le journal d'audit.

    Ne lève jamais d'exception : un échec d'audit ne doit pas bloquer l'action métier.
    """
    try:
        ip_address = None
        user_agent = None

        if request is not None:
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                ip_address = forwarded.split(",")[0].strip()
            elif request.client:
                ip_address = request.client.host
            user_agent = (request.headers.get("user-agent") or "")[:300]

            if not actor:
                actor = request.headers.get("x-user") or None

        if isinstance(details, (dict, list)):
            details = json.dumps(details, ensure_ascii=False, default=str)

        entry = AuditLog(
            actor=(str(actor)[:150] if actor else "anonyme"),
            action=str(action)[:100],
            resource_type=(str(resource_type)[:100] if resource_type else None),
            resource_id=(str(resource_id)[:100] if resource_id is not None else None),
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        db.add(entry)
        db.commit()
    except Exception as exc:  # pragma: no cover - best effort
        try:
            db.rollback()
        except Exception:
            pass
        print(f"[AUDIT] Échec d'enregistrement de l'action '{action}': {exc}")
