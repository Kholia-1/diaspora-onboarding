from fastapi import APIRouter, Body

from app.services.mastercard_gateway_service import (
    public_config_status,
    initiate_checkout_session,
    retrieve_order,
    save_mastercard_operational_config,
)


router = APIRouter(
    prefix="/api/backoffice/mastercard",
    tags=["Mastercard Gateway"]
)


@router.get("/config-status")
def mastercard_config_status():
    return public_config_status()


@router.post("/initiate-test-checkout")
def mastercard_initiate_test_checkout(payload: dict = Body(default={})):
    order_id = payload.get("order_id")
    amount = payload.get("amount", 5000)
    currency = payload.get("currency")
    description = payload.get("description") or "Paiement package diaspora - test"
    dry_run = payload.get("dry_run", True)

    return initiate_checkout_session(
        order_id=order_id,
        amount=amount,
        currency=currency,
        description=description,
        dry_run=bool(dry_run)
    )


@router.post("/retrieve-test-order")
def mastercard_retrieve_test_order(payload: dict = Body(default={})):
    order_id = payload.get("order_id")
    dry_run = payload.get("dry_run", True)

    if not order_id:
        return {
            "success": False,
            "status": "MISSING_ORDER_ID",
            "message": "order_id est obligatoire."
        }

    return retrieve_order(
        order_id=order_id,
        dry_run=bool(dry_run)
    )


# MASTERCARD_MONETIQUE_CHECKLIST_V1
import json
from pathlib import Path


CHECKLIST_PATH = Path("data/mastercard_monetique_checklist.json")


DEFAULT_MONETIQUE_CHECKLIST = [
    {
        "key": "merchant_id",
        "category": "Identifiants",
        "label": "Merchant ID Mastercard Gateway",
        "description": "Identifiant marchand fourni par la monétique ou l’acquéreur.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    },
    {
        "key": "api_password",
        "category": "Identifiants",
        "label": "API Password Mastercard Gateway",
        "description": "Mot de passe API sensible. À stocker dans .env ou coffre-fort, jamais dans Git.",
        "status": "MISSING",
        "sensitive": True,
        "notes": "Ne pas saisir le vrai secret dans le dépôt Git."
    },
    {
        "key": "sandbox_base_url",
        "category": "Environnement",
        "label": "Base URL Sandbox",
        "description": "URL de test Mastercard Gateway, par exemple https://test-gateway.mastercard.com.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    },
    {
        "key": "production_base_url",
        "category": "Environnement",
        "label": "Base URL Production",
        "description": "URL de production fournie par Mastercard / acquéreur.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    },
    {
        "key": "api_version",
        "category": "Technique",
        "label": "Version API",
        "description": "Version API à utiliser, par exemple 100, à confirmer par la monétique.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    },
    {
        "key": "currency",
        "category": "Paiement",
        "label": "Devise autorisée",
        "description": "Confirmer si XAF est accepté. Sinon préciser EUR, USD ou autre devise.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    },
    {
        "key": "operation",
        "category": "Paiement",
        "label": "Type d’opération",
        "description": "PURCHASE pour débit immédiat, ou AUTHORIZE/CAPTURE selon la procédure banque.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    },
    {
        "key": "return_url",
        "category": "URLs",
        "label": "Return URL à déclarer",
        "description": "URL navigateur où Mastercard renvoie le client après paiement.",
        "status": "MISSING",
        "sensitive": False,
        "notes": "https://80-65-211-49.sslip.io/api/payments/mastercard/return"
    },
    {
        "key": "webhook_url",
        "category": "URLs",
        "label": "Webhook / Notification URL",
        "description": "URL serveur pour recevoir les notifications Mastercard.",
        "status": "MISSING",
        "sensitive": False,
        "notes": "https://80-65-211-49.sslip.io/api/payments/mastercard/webhook"
    },
    {
        "key": "test_cards",
        "category": "Tests",
        "label": "Cartes de test Sandbox",
        "description": "Cartes de test, scénarios succès/échec, 3DS, paiement refusé.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    },
    {
        "key": "go_live_process",
        "category": "Production",
        "label": "Procédure de passage en production",
        "description": "Étapes de validation, habilitations, restrictions IP, sécurité et support.",
        "status": "MISSING",
        "sensitive": False,
        "notes": ""
    }
]


VALID_CHECKLIST_STATUS = {
    "MISSING",
    "REQUESTED",
    "RECEIVED",
    "VALIDATED"
}


def ensure_monetique_checklist():
    CHECKLIST_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not CHECKLIST_PATH.exists():
        CHECKLIST_PATH.write_text(
            json.dumps({"items": DEFAULT_MONETIQUE_CHECKLIST}, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

    try:
        data = json.loads(CHECKLIST_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {"items": DEFAULT_MONETIQUE_CHECKLIST}

    current_items = data.get("items", [])

    existing_by_key = {
        str(item.get("key")): item
        for item in current_items
        if item.get("key")
    }

    merged = []

    for default_item in DEFAULT_MONETIQUE_CHECKLIST:
        key = default_item["key"]
        item = dict(default_item)

        if key in existing_by_key:
            old = existing_by_key[key]
            item["status"] = old.get("status") or item["status"]
            item["notes"] = old.get("notes") or item["notes"]

        if item["status"] not in VALID_CHECKLIST_STATUS:
            item["status"] = "MISSING"

        merged.append(item)

    data = {"items": merged}

    CHECKLIST_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return data


@router.get("/monetique-checklist")
def get_monetique_checklist():
    data = ensure_monetique_checklist()

    total = len(data["items"])
    validated = len([i for i in data["items"] if i.get("status") == "VALIDATED"])
    received = len([i for i in data["items"] if i.get("status") in ["RECEIVED", "VALIDATED"]])
    missing = len([i for i in data["items"] if i.get("status") == "MISSING"])

    return {
        "items": data["items"],
        "summary": {
            "total": total,
            "received_or_validated": received,
            "validated": validated,
            "missing": missing,
            "completion_percent": round((validated / total) * 100, 2) if total else 0
        }
    }


@router.post("/monetique-checklist")
def save_monetique_checklist(payload: dict = Body(...)):
    current = ensure_monetique_checklist()
    current_by_key = {
        item["key"]: item
        for item in current["items"]
    }

    received_items = payload.get("items", [])

    for incoming in received_items:
        key = incoming.get("key")

        if key not in current_by_key:
            continue

        status = incoming.get("status") or "MISSING"

        if status not in VALID_CHECKLIST_STATUS:
            status = "MISSING"

        current_by_key[key]["status"] = status
        current_by_key[key]["notes"] = str(incoming.get("notes") or "").strip()

    updated = {
        "items": list(current_by_key.values())
    }

    CHECKLIST_PATH.write_text(
        json.dumps(updated, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    return {
        "message": "Checklist monétique Mastercard sauvegardée.",
        "items": updated["items"]
    }


@router.get("/monetique-request-text")
def get_monetique_request_text():
    config_status = public_config_status()

    return {
        "subject": "Demande paramètres Mastercard Gateway / MPGS - Diaspora Onboarding",
        "body": f"""Bonjour,

Dans le cadre du projet Diaspora Onboarding, nous préparons l’intégration Mastercard Gateway / MPGS en mode Hosted Checkout.

Merci de nous fournir ou confirmer les éléments suivants :

1. Merchant ID Mastercard Gateway
2. API Password Mastercard Gateway
3. Base URL Sandbox
4. Base URL Production
5. Version API à utiliser
6. Devise autorisée pour les paiements : XAF, EUR, USD ou autre
7. Type d’opération recommandé : PURCHASE ou AUTHORIZE/CAPTURE
8. Cartes de test Sandbox et scénarios de test
9. Procédure de passage en production
10. Contraintes de sécurité : restriction IP, signature webhook, certificats, 3DS, etc.

URLs à déclarer côté Mastercard :

Return URL :
{config_status.get("return_url")}

Webhook / Notification URL :
{config_status.get("webhook_url")}

Merci également de confirmer si le paiement Hosted Checkout est bien le mode recommandé pour ce cas d’usage.

Cordialement."""
    }

# MASTERCARD_OPERATIONAL_CONFIG_ROUTES_V1

@router.get("/operational-config")
def get_mastercard_operational_config():
    return public_config_status()


@router.post("/operational-config")
def save_mastercard_operational_config_route(payload: dict = Body(default={})):
    return save_mastercard_operational_config(payload)

