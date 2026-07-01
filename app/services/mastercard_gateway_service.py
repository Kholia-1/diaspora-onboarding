import base64
import json
import os
import uuid
import urllib.request
import urllib.error
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP


CONFIG_PATH = Path("data/api_integrations.json")


def mask_secret(value):
    value = str(value or "")

    if not value:
        return ""

    if len(value) <= 6:
        return "***"

    return value[:3] + "***" + value[-3:]


def bool_value(value):
    if isinstance(value, bool):
        return value

    return str(value or "").strip().lower() in ["1", "true", "yes", "oui", "on", "enabled", "active"]


def load_mastercard_config():
    item = {}

    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

            for integration in data.get("integrations", []):
                if str(integration.get("code", "")).upper() == "MASTERCARD":
                    item = dict(integration)
                    break
        except Exception:
            item = {}

    # Les variables d'environnement ont priorité sur le fichier JSON.
    config = {
        "enabled": bool_value(os.getenv("MASTERCARD_ENABLED", item.get("enabled", False))),
        "environment": os.getenv("MASTERCARD_ENVIRONMENT", item.get("environment") or "SANDBOX"),
        "provider": item.get("provider") or "MASTERCARD_GATEWAY",
        "base_url": os.getenv("MASTERCARD_GATEWAY_BASE_URL", item.get("base_url") or "https://test-gateway.mastercard.com"),
        "merchant_id": os.getenv("MASTERCARD_MERCHANT_ID", item.get("merchant_id") or ""),
        "api_password": os.getenv("MASTERCARD_API_PASSWORD", item.get("api_key") or item.get("api_password") or ""),
        "api_version": os.getenv("MASTERCARD_API_VERSION", str(item.get("api_version") or "100")),
        "currency": os.getenv("MASTERCARD_CURRENCY", item.get("currency") or "XAF"),
        "operation": os.getenv("MASTERCARD_OPERATION", item.get("operation") or "PURCHASE"),
        "return_url": os.getenv("MASTERCARD_RETURN_URL", item.get("callback_url") or "https://80-65-211-49.sslip.io/api/payments/mastercard/return"),
        "webhook_url": os.getenv("MASTERCARD_WEBHOOK_URL", item.get("webhook_url") or "https://80-65-211-49.sslip.io/api/payments/mastercard/webhook"),
    }

    config["base_url"] = str(config["base_url"] or "").rstrip("/")

    return config


def public_config_status():
    config = load_mastercard_config()
    missing = validate_mastercard_config(config)

    return {
        "enabled": config["enabled"],
        "environment": config["environment"],
        "provider": config["provider"],
        "base_url": config["base_url"],
        "merchant_id_configured": bool(config["merchant_id"]),
        "merchant_id": mask_secret(config["merchant_id"]),
        "api_password_configured": bool(config["api_password"]),
        "api_password": mask_secret(config["api_password"]),
        "api_version": config["api_version"],
        "currency": config["currency"],
        "operation": config["operation"],
        "return_url": config["return_url"],
        "webhook_url": config["webhook_url"],
        "ready_for_real_call": len(missing) == 0,
        "missing": missing
    }


def validate_mastercard_config(config=None):
    config = config or load_mastercard_config()

    missing = []

    if not config.get("enabled"):
        missing.append("Intégration Mastercard désactivée.")

    if not config.get("base_url"):
        missing.append("Base URL Mastercard Gateway manquante.")

    if not config.get("merchant_id"):
        missing.append("Merchant ID manquant.")

    if not config.get("api_password"):
        missing.append("API Password Mastercard manquant.")

    if not config.get("api_version"):
        missing.append("API version manquante.")

    if not config.get("currency"):
        missing.append("Devise manquante.")

    if not config.get("operation"):
        missing.append("Type d’opération Mastercard manquant.")

    if not config.get("return_url"):
        missing.append("Return URL Mastercard manquante.")

    if not config.get("webhook_url"):
        missing.append("Webhook URL Mastercard manquante.")

    return missing


def format_amount(amount):
    value = Decimal(str(amount or "0")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return str(value)


def build_auth_header(config):
    username = "merchant." + str(config["merchant_id"])
    password = str(config["api_password"])

    raw = f"{username}:{password}".encode("utf-8")
    token = base64.b64encode(raw).decode("ascii")

    return "Basic " + token


def gateway_url(config, path):
    return config["base_url"].rstrip("/") + path


def post_json(path, payload, config=None):
    config = config or load_mastercard_config()

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    req = urllib.request.Request(
        gateway_url(config, path),
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": build_auth_header(config),
            "User-Agent": "Diaspora-Onboarding-Mastercard/1.0"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8", errors="replace")

            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"raw": raw}

            return {
                "success": True,
                "http_status": response.status,
                "response": parsed
            }

    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")

        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}

        return {
            "success": False,
            "http_status": exc.code,
            "response": parsed
        }

    except Exception as exc:
        return {
            "success": False,
            "http_status": None,
            "response": {
                "error": str(exc)
            }
        }


def get_json(path, config=None):
    config = config or load_mastercard_config()

    req = urllib.request.Request(
        gateway_url(config, path),
        method="GET",
        headers={
            "Authorization": build_auth_header(config),
            "User-Agent": "Diaspora-Onboarding-Mastercard/1.0"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8", errors="replace")

            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"raw": raw}

            return {
                "success": True,
                "http_status": response.status,
                "response": parsed
            }

    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")

        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}

        return {
            "success": False,
            "http_status": exc.code,
            "response": parsed
        }

    except Exception as exc:
        return {
            "success": False,
            "http_status": None,
            "response": {
                "error": str(exc)
            }
        }


def build_initiate_checkout_payload(order_id, amount, currency=None, description=None):
    config = load_mastercard_config()

    return {
        "apiOperation": "INITIATE_CHECKOUT",
        "checkoutMode": "WEBSITE",
        "interaction": {
            "operation": config["operation"],
            "returnUrl": config["return_url"],
            "merchant": {
                "name": "Afriland First Bank - Diaspora Onboarding"
            },
            "displayControl": {
                "billingAddress": "HIDE",
                "customerEmail": "HIDE",
                "shipping": "HIDE"
            }
        },
        "order": {
            "id": order_id,
            "amount": format_amount(amount),
            "currency": currency or config["currency"],
            "description": description or "Paiement package ouverture de compte diaspora"
        }
    }


def initiate_checkout_session(order_id=None, amount=0, currency=None, description=None, dry_run=True):
    config = load_mastercard_config()

    order_id = order_id or ("DIA-MC-" + uuid.uuid4().hex[:12].upper())

    payload = build_initiate_checkout_payload(
        order_id=order_id,
        amount=amount,
        currency=currency or config["currency"],
        description=description
    )

    path = f"/api/rest/version/{config['api_version']}/merchant/{config['merchant_id'] or 'MERCHANT_ID'}/session"

    if dry_run:
        return {
            "success": True,
            "status": "DRY_RUN",
            "message": "Requête Mastercard Initiate Checkout préparée. Aucun appel réel envoyé.",
            "path": path,
            "config": public_config_status(),
            "payload": payload
        }

    missing = validate_mastercard_config(config)

    if missing:
        return {
            "success": False,
            "status": "CONFIG_INCOMPLETE",
            "message": "Configuration Mastercard incomplète.",
            "missing": missing,
            "payload": payload
        }

    result = post_json(path, payload, config=config)

    return {
        "success": result["success"],
        "status": "REAL_CALL_SENT",
        "message": "Appel réel envoyé à Mastercard Gateway.",
        "path": path,
        "payload": payload,
        "gateway_response": result
    }


def retrieve_order(order_id, dry_run=True):
    config = load_mastercard_config()

    path = f"/api/rest/version/{config['api_version']}/merchant/{config['merchant_id'] or 'MERCHANT_ID'}/order/{order_id}"

    if dry_run:
        return {
            "success": True,
            "status": "DRY_RUN",
            "message": "Requête Mastercard Retrieve Order préparée. Aucun appel réel envoyé.",
            "path": path,
            "config": public_config_status()
        }

    missing = validate_mastercard_config(config)

    if missing:
        return {
            "success": False,
            "status": "CONFIG_INCOMPLETE",
            "message": "Configuration Mastercard incomplète.",
            "missing": missing
        }

    result = get_json(path, config=config)

    return {
        "success": result["success"],
        "status": "REAL_CALL_SENT",
        "message": "Appel Retrieve Order envoyé à Mastercard Gateway.",
        "path": path,
        "gateway_response": result
    }

# MASTERCARD_OPERATIONAL_CONFIG_V1

def mastercard_env_overrides():
    keys = [
        "MASTERCARD_ENABLED",
        "MASTERCARD_ENVIRONMENT",
        "MASTERCARD_GATEWAY_BASE_URL",
        "MASTERCARD_MERCHANT_ID",
        "MASTERCARD_API_PASSWORD",
        "MASTERCARD_API_VERSION",
        "MASTERCARD_CURRENCY",
        "MASTERCARD_OPERATION",
        "MASTERCARD_RETURN_URL",
        "MASTERCARD_WEBHOOK_URL",
    ]

    return [key for key in keys if os.getenv(key)]


def load_api_integrations_data():
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    else:
        data = {}

    if not isinstance(data, dict):
        data = {}

    if not isinstance(data.get("integrations"), list):
        data["integrations"] = []

    return data


def find_or_create_mastercard_integration(data):
    for integration in data.get("integrations", []):
        if str(integration.get("code", "")).upper() == "MASTERCARD":
            return integration

    integration = {
        "code": "MASTERCARD",
        "name": "Mastercard Gateway",
        "enabled": False,
        "environment": "SANDBOX",
        "provider": "MASTERCARD_GATEWAY",
        "base_url": "https://test-gateway.mastercard.com",
        "merchant_id": "",
        "api_password": "",
        "api_version": "100",
        "currency": "XAF",
        "operation": "PURCHASE",
        "callback_url": "https://80-65-211-49.sslip.io/api/payments/mastercard/return",
        "webhook_url": "https://80-65-211-49.sslip.io/api/payments/mastercard/webhook",
    }

    data["integrations"].append(integration)

    return integration


def clean_text(value):
    if value is None:
        return ""

    return str(value).strip()


def upper_or_default(value, default_value):
    value = clean_text(value)

    if not value:
        return default_value

    return value.upper()


def save_mastercard_operational_config(payload):
    payload = payload or {}

    data = load_api_integrations_data()
    integration = find_or_create_mastercard_integration(data)

    integration["code"] = "MASTERCARD"
    integration["name"] = payload.get("name") or integration.get("name") or "Mastercard Gateway"
    integration["provider"] = "MASTERCARD_GATEWAY"

    if "enabled" in payload:
        integration["enabled"] = bool_value(payload.get("enabled"))

    integration["environment"] = upper_or_default(
        payload.get("environment", integration.get("environment")),
        "SANDBOX"
    )

    integration["base_url"] = clean_text(
        payload.get("base_url", integration.get("base_url") or "https://test-gateway.mastercard.com")
    ).rstrip("/")

    merchant_id = clean_text(payload.get("merchant_id"))
    if merchant_id:
        integration["merchant_id"] = merchant_id

    api_password = clean_text(payload.get("api_password"))
    if api_password:
        integration["api_password"] = api_password

        # Compatibilité avec l’ancienne structure générique des intégrations.
        integration["api_key"] = api_password

    integration["api_version"] = clean_text(
        payload.get("api_version", integration.get("api_version") or "100")
    ) or "100"

    integration["currency"] = upper_or_default(
        payload.get("currency", integration.get("currency")),
        "XAF"
    )

    integration["operation"] = upper_or_default(
        payload.get("operation", integration.get("operation")),
        "PURCHASE"
    )

    return_url = clean_text(payload.get("return_url", integration.get("callback_url") or integration.get("return_url")))
    if return_url:
        integration["callback_url"] = return_url
        integration["return_url"] = return_url

    webhook_url = clean_text(payload.get("webhook_url", integration.get("webhook_url")))
    if webhook_url:
        integration["webhook_url"] = webhook_url

    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    status = public_config_status()

    return {
        "success": True,
        "message": "Configuration opérationnelle Mastercard enregistrée.",
        "config": status,
        "env_overrides": mastercard_env_overrides(),
        "warning": (
            "Certaines variables d’environnement Mastercard sont définies et peuvent avoir priorité sur data/api_integrations.json."
            if mastercard_env_overrides()
            else ""
        )
    }

