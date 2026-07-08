import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


DATA_DIR = Path("data")
CONFIG_FILE = DATA_DIR / "callbell_settings.json"
API_INTEGRATIONS_FILE = DATA_DIR / "api_integrations.json"
NOTIFICATION_LOG = DATA_DIR / "notifications.log"


def _load_file_config():
    if not CONFIG_FILE.exists():
        return {}

    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _load_admin_callbell_config():
    """
    Lit la configuration Callbell depuis l'interface admin :
    data/api_integrations.json → WHATSAPP_CALLBELL.
    """
    if not API_INTEGRATIONS_FILE.exists():
        return {}

    try:
        data = json.loads(API_INTEGRATIONS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

    if isinstance(data, dict):
        items = data.get("integrations") or data.get("items") or data.get("api_integrations") or []
        if not items:
            items = [data]
    elif isinstance(data, list):
        items = data
    else:
        items = []

    best = {}

    for item in items:
        code = str(item.get("code") or "").upper()
        provider = str(item.get("provider") or "").upper()
        blob = json.dumps(item, ensure_ascii=False).lower()

        if code == "WHATSAPP_CALLBELL" or provider == "CALLBELL" or "callbell" in blob:
            best = item
            break

    if not best:
        return {}

    return {
        "enabled": best.get("enabled"),
        "base_url": best.get("base_url") or "https://api.callbell.eu",
        "api_token": (
            best.get("api_key")
            or best.get("token")
            or best.get("bearer_token")
            or best.get("access_token")
            or ""
        ),
        "channel_uuid": (
            best.get("channel_uuid")
            or best.get("client_id")
            or best.get("phone_number_id")
            or ""
        ),
        "template_uuid": (
            best.get("template_uuid")
            or best.get("client_secret")
            or ""
        ),
        "use_template": best.get("use_template", True),
        "default_country_code": best.get("default_country_code") or "+237",
    }


def _first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        value = str(value).strip()
        if value:
            return value
    return ""


def _as_bool(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in {"1", "true", "yes", "oui", "on", "enabled"}


def get_callbell_config():
    file_config = _load_file_config()
    admin_config = _load_admin_callbell_config()

    enabled_value = _first_non_empty(
        os.getenv("CALLBELL_ENABLED"),
        admin_config.get("enabled"),
        file_config.get("enabled")
    )

    use_template_value = _first_non_empty(
        os.getenv("CALLBELL_USE_TEMPLATE"),
        admin_config.get("use_template"),
        file_config.get("use_template")
    )

    return {
        "enabled": _as_bool(enabled_value, False),
        "base_url": _first_non_empty(
            os.getenv("CALLBELL_BASE_URL"),
            admin_config.get("base_url"),
            file_config.get("base_url"),
            "https://api.callbell.eu"
        ).rstrip("/"),
        "api_token": _first_non_empty(
            os.getenv("CALLBELL_API_TOKEN"),
            admin_config.get("api_token"),
            file_config.get("api_token")
        ),
        "channel_uuid": _first_non_empty(
            os.getenv("CALLBELL_CHANNEL_UUID"),
            admin_config.get("channel_uuid"),
            file_config.get("channel_uuid")
        ),
        "template_uuid": _first_non_empty(
            os.getenv("CALLBELL_TEMPLATE_UUID"),
            admin_config.get("template_uuid"),
            file_config.get("template_uuid")
        ),
        "use_template": _as_bool(use_template_value, True),
        "default_country_code": _first_non_empty(
            os.getenv("CALLBELL_DEFAULT_COUNTRY_CODE"),
            admin_config.get("default_country_code"),
            file_config.get("default_country_code"),
            "+237"
        ),
    }


def public_callbell_config_status():
    config = get_callbell_config()
    token = config.get("api_token") or ""

    return {
        "enabled": config["enabled"],
        "base_url": config["base_url"],
        "api_token_configured": bool(token),
        "api_token_masked": f"{token[:4]}***{token[-4:]}" if len(token) >= 8 else "",
        "channel_uuid_configured": bool(config["channel_uuid"]),
        "channel_uuid": config["channel_uuid"],
        "template_uuid_configured": bool(config["template_uuid"]),
        "template_uuid": config["template_uuid"],
        "use_template": config["use_template"],
        "default_country_code": config["default_country_code"],
        "ready": bool(token and config["channel_uuid"]),
    }


def _append_notification_log(record: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    safe_record = dict(record)
    safe_record.pop("api_token", None)

    with NOTIFICATION_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(safe_record, ensure_ascii=False) + "\n")


def normalize_phone(phone: str, default_country_code="+237") -> str:
    value = str(phone or "").strip()

    value = (
        value.replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if not value:
        return ""

    if value.startswith("+"):
        return value

    if value.startswith("00"):
        return "+" + value[2:]

    if value.startswith("237"):
        return "+" + value

    if value.startswith("6") and len(value) == 9:
        return default_country_code + value

    return value


def build_whatsapp_message(event_type: str, context: dict):
    context = context or {}

    full_name = context.get("full_name") or context.get("client_name") or "Cher client"
    reference = context.get("reference") or context.get("application_reference") or ""
    payment_url = context.get("payment_url") or ""
    package_name = context.get("package_name") or "votre package"
    amount = context.get("amount") or ""
    currency = context.get("currency") or "XAF"
    account_number = context.get("account_number") or ""

    event_type = str(event_type or "").upper()

    if event_type == "DOSSIER_SOUMIS":
        return f"Bonjour {full_name}, votre dossier d’ouverture de compte diaspora {reference} a été soumis avec succès."

    if event_type == "DOSSIER_APPROUVE":
        return f"Bonjour {full_name}, votre dossier {reference} a été approuvé par la banque."

    if event_type == "LIEN_PAIEMENT":
        return (
            f"Bonjour {full_name}, votre dossier {reference} est approuvé. "
            f"Veuillez procéder au paiement de {package_name} d’un montant de {amount} {currency} ici : {payment_url}"
        )

    if event_type == "PAIEMENT_CONFIRME":
        return f"Bonjour {full_name}, le paiement lié à votre dossier {reference} a été confirmé."

    if event_type == "COMPTE_OUVERT":
        if account_number:
            return f"Bonjour {full_name}, votre compte lié au dossier {reference} est ouvert. Numéro de compte : {account_number}."
        return f"Bonjour {full_name}, votre compte lié au dossier {reference} est ouvert."

    if event_type == "COMPLEMENT_DOCUMENTAIRE":
        return f"Bonjour {full_name}, un complément documentaire est demandé pour votre dossier {reference}. Veuillez consulter votre suivi client."

    return f"Bonjour {full_name}, une mise à jour est disponible pour votre dossier {reference}."


def _build_callbell_payload(phone: str, message: str, context: dict | None = None):
    config = get_callbell_config()
    context = context or {}

    payload = {
        "to": normalize_phone(phone, config["default_country_code"]),
        "from": "whatsapp",
        "type": "text",
        "channel_uuid": config["channel_uuid"],
        "content": {
            "text": message
        },
        "metadata": {
            "source": "diaspora_onboarding",
            "event_type": str(context.get("event_type") or "")[:50],
            "reference": str(context.get("reference") or context.get("application_reference") or "")[:500],
        }
    }

    if config["use_template"] and config["template_uuid"]:
        payload["template_uuid"] = config["template_uuid"]
        payload["optin_contact"] = True

        template_values = context.get("template_values")

        if isinstance(template_values, list) and template_values:
            payload["template_values"] = [str(v) for v in template_values]
        else:
            # Le template Callbell configuré attend 1 variable.
            # Par défaut, on transmet le message préparé comme valeur unique.
            payload["template_values"] = [str(message)]

    return payload


def send_callbell_message(phone: str, message: str, context: dict | None = None, dry_run=None):
    config = get_callbell_config()
    context = context or {}

    payload = _build_callbell_payload(phone, message, context)

    missing = []

    if not payload["to"]:
        missing.append("Numéro WhatsApp destinataire manquant.")

    if not config["api_token"]:
        missing.append("CALLBELL_API_TOKEN manquant.")

    if not config["channel_uuid"]:
        missing.append("CALLBELL_CHANNEL_UUID manquant.")

    if config["use_template"] and not config["template_uuid"]:
        missing.append("CALLBELL_TEMPLATE_UUID manquant alors que use_template=true.")

    if dry_run is None:
        dry_run = not config["enabled"]

    base_result = {
        "provider": "CALLBELL",
        "channel": "WHATSAPP",
        "dry_run": bool(dry_run),
        "enabled": config["enabled"],
        "to": payload["to"],
        "prepared_message": message,
        "payload_preview": {
            k: v for k, v in payload.items()
            if k not in {"metadata"}
        },
        "missing": missing,
    }

    if missing:
        result = {
            **base_result,
            "status": "CONFIG_INCOMPLETE",
            "sent": False,
        }
        _append_notification_log({
            "created_at": datetime.now(timezone.utc).isoformat(),
            "event": "callbell_config_incomplete",
            "result": result,
        })
        return result

    if dry_run:
        result = {
            **base_result,
            "status": "DRY_RUN",
            "sent": False,
            "message": "Message préparé mais non envoyé."
        }
        _append_notification_log({
            "created_at": datetime.now(timezone.utc).isoformat(),
            "event": "callbell_dry_run",
            "result": result,
        })
        return result

    url = f"{config['base_url']}/v1/messages/send"

    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {config['api_token']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; DiasporaOnboarding/1.0; +https://diaspora-onboarding.com)",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8", errors="replace")

            try:
                parsed = json.loads(body)
            except Exception:
                parsed = {"raw": body}

            result = {
                **base_result,
                "status": "SENT",
                "sent": True,
                "http_status": response.status,
                "response": parsed,
            }

            _append_notification_log({
                "created_at": datetime.now(timezone.utc).isoformat(),
                "event": "callbell_sent",
                "to": payload["to"],
                "http_status": response.status,
                "response": parsed,
            })

            return result

    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")

        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}

        result = {
            **base_result,
            "status": "HTTP_ERROR",
            "sent": False,
            "http_status": exc.code,
            "response": parsed,
        }

        _append_notification_log({
            "created_at": datetime.now(timezone.utc).isoformat(),
            "event": "callbell_http_error",
            "to": payload["to"],
            "http_status": exc.code,
            "response": parsed,
        })

        return result

    except Exception as exc:
        result = {
            **base_result,
            "status": "SEND_FAILED",
            "sent": False,
            "error": str(exc),
        }

        _append_notification_log({
            "created_at": datetime.now(timezone.utc).isoformat(),
            "event": "callbell_send_failed",
            "to": payload["to"],
            "error": str(exc),
        })

        return result


def send_whatsapp_notification(phone: str, event_type: str, context: dict | None = None, dry_run=None):
    context = context or {}
    context = dict(context)
    context["event_type"] = event_type

    message = build_whatsapp_message(event_type, context)

    return send_callbell_message(
        phone=phone,
        message=message,
        context=context,
        dry_run=dry_run
    )
