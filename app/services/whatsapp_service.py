import json
import os
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any


CONFIG_PATH = Path("data/api_integrations.json")


def bool_value(value) -> bool:
    if isinstance(value, bool):
        return value

    return str(value or "").strip().lower() in {
        "1", "true", "yes", "oui", "on", "enabled", "active"
    }


def load_callbell_integration_from_json() -> dict:
    if not CONFIG_PATH.exists():
        return {}

    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

    integrations = data.get("integrations", [])

    if not isinstance(integrations, list):
        return {}

    for item in integrations:
        if str(item.get("code", "")).upper() == "WHATSAPP_CALLBELL":
            return dict(item)

    for item in integrations:
        if str(item.get("provider", "")).upper() == "CALLBELL":
            return dict(item)

    return {}


def build_callbell_api_url(base_url: str | None) -> str:
    base_url = str(base_url or "https://api.callbell.eu").strip().rstrip("/")

    if base_url.endswith("/v1/messages/send"):
        return base_url

    if base_url.endswith("/v1"):
        return base_url + "/messages/send"

    return base_url + "/v1/messages/send"


def whatsapp_is_enabled() -> bool:
    """
    Source principale : configuration admin data/api_integrations.json.
    Source de secours : variable d'environnement WHATSAPP_ENABLED.

    Objectif :
    - si l'admin active WHATSAPP_CALLBELL, le backend doit respecter ce choix ;
    - .env ne doit pas bloquer l'admin avec WHATSAPP_ENABLED=false.
    """
    config = load_callbell_integration_from_json()

    if "enabled" in config:
        return bool_value(config.get("enabled"))

    env_value = os.getenv("CALLBELL_ENABLED") or os.getenv("WHATSAPP_ENABLED")

    if env_value is not None:
        return bool_value(env_value)

    return False


def get_callbell_config() -> dict[str, str | None]:
    item = load_callbell_integration_from_json()

    base_url = (
        os.getenv("CALLBELL_API_BASE_URL")
        or os.getenv("CALLBELL_BASE_URL")
        or item.get("base_url")
        or "https://api.callbell.eu"
    )

    bearer_token = (
        os.getenv("CALLBELL_API_TOKEN")
        or os.getenv("CALLBELL_BEARER_TOKEN")
        or item.get("api_key")
        or item.get("bearer_token")
        or item.get("access_token")
        or ""
    )

    channel_uuid = (
        os.getenv("CALLBELL_CHANNEL_UUID")
        or item.get("channel_uuid")
        or item.get("phone_number_id")
        or item.get("client_id")
        or ""
    )

    template_uuid = (
        os.getenv("CALLBELL_TEMPLATE_UUID")
        or item.get("template_uuid")
        or item.get("business_account_id")
        or ""
    )

    # AFB_CALLBELL_FREEFORM_OTP_V1
    # use_template=false -> envoi en texte libre (conversation de service, gratuite
    # chez Meta) : contourne le blocage facturation 131042 qui ne touche que les
    # conversations template (facturées). Nécessite une fenêtre de service ouverte
    # (le destinataire a écrit au numéro dans les dernières 24 h), sinon l'envoi
    # échoue et le fallback d'affichage du code prend le relais.
    use_template_value = os.getenv("CALLBELL_USE_TEMPLATE")
    if use_template_value is None and "use_template" in item:
        use_template_value = item.get("use_template")

    return {
        "api_url": os.getenv("CALLBELL_API_URL") or build_callbell_api_url(base_url),
        "bearer_token": bearer_token,
        "channel_uuid": channel_uuid,
        "template_uuid": template_uuid,
        "use_template": bool_value(use_template_value) if use_template_value is not None else True,
    }


def normalize_phone_number(phone: str) -> str:
    phone = (phone or "").strip().replace(" ", "").replace("-", "")

    if not phone:
        return phone

    if phone.startswith("00"):
        return "+" + phone[2:]

    if phone.startswith("+"):
        return phone

    if phone.startswith("6") and len(phone) == 9:
        return "+237" + phone

    return phone


def validate_callbell_config() -> list[str]:
    config = get_callbell_config()
    missing = []

    if not whatsapp_is_enabled():
        missing.append("Intégration WhatsApp Callbell désactivée.")

    if not config["bearer_token"]:
        missing.append("Bearer Token Callbell manquant.")

    if not config["channel_uuid"]:
        missing.append("Channel UUID Callbell manquant.")

    if config["use_template"] and not config["template_uuid"]:
        missing.append("Template UUID Callbell manquant.")

    return missing


def send_whatsapp_message(
    to_phone: str,
    message: str,
    template_values: list[str] | None = None,
) -> dict[str, Any]:
    missing = validate_callbell_config()

    if missing:
        return {
            "success": False,
            "status": "CONFIGURATION_INCOMPLETE",
            "message": "Configuration WhatsApp Callbell incomplète.",
            "missing": missing,
        }

    config = get_callbell_config()
    normalized_phone = normalize_phone_number(to_phone)

    if config.get("use_template"):
        payload = {
            "to": normalized_phone,
            "from": "whatsapp",
            "type": "template",
            "channel_uuid": config["channel_uuid"],
            "template_uuid": config["template_uuid"],
            "template_values": [message],
            "optin_contact": True
        }

    else:
        payload = {
            "to": normalized_phone,
            "from": "whatsapp",
            "type": "text",
            "channel_uuid": config["channel_uuid"],
            "content": {
                "text": message
            },
            "optin_contact": True
        }

    # AFB_CALLBELL_FREEFORM_OTP_V1 : sans template_uuid, Callbell envoie le
    # texte libre tel quel (pas d'habillage « Bonjour cher(e) client ... »).
    if config["use_template"]:
        payload["template_uuid"] = config["template_uuid"]
        payload["template_values"] = template_values if template_values is not None else [message]

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        config["api_url"],
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {config['bearer_token']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "DiasporaOnboarding/1.0 (+https://diaspora-onboarding.com)",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
        },
    )

    # AFB_CALLBELL_NETWORK_RETRY_V1 : une erreur réseau transitoire (timeout,
    # DNS, coupure TLS) est retentée une fois avant de renvoyer CALLBELL_ERROR.
    # Les réponses HTTP d'erreur ne sont PAS retentées (le serveur a répondu).
    last_network_error = None

    for _attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                body = response.read().decode("utf-8", errors="replace")

                try:
                    parsed_body = json.loads(body) if body else {}
                except Exception:
                    parsed_body = {"raw": body}

                message_obj = {}
                if isinstance(parsed_body, dict):
                    message_obj = parsed_body.get("message") or {}

                callbell_uuid = message_obj.get("uuid")
                callbell_status = message_obj.get("status")

                # Un HTTP 200 sans UUID de message signifie que Callbell n'a pas
                # réellement accepté le message : ne pas le compter comme envoyé.
                failed_statuses = {"failed", "error", "rejected", "undelivered"}
                if not callbell_uuid or str(callbell_status or "").lower() in failed_statuses:
                    return {
                        "success": False,
                        "status": str(callbell_status or "CALLBELL_NOT_ACCEPTED").upper(),
                        "http_status": response.status,
                        "to": normalized_phone,
                        "provider": "CALLBELL",
                        "callbell_message_uuid": callbell_uuid,
                        "callbell_message_status": callbell_status,
                        "response": parsed_body,
                    }

                return {
                    "success": True,
                    "status": str(callbell_status or "ACCEPTED_BY_CALLBELL").upper(),
                    "http_status": response.status,
                    "to": normalized_phone,
                    "provider": "CALLBELL",
                    "callbell_message_uuid": callbell_uuid,
                    "callbell_message_status": callbell_status,
                    "response": parsed_body,
                }

        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")

            try:
                parsed_body = json.loads(body) if body else {}
            except Exception:
                parsed_body = {"raw": body}

            return {
                "success": False,
                "status": "CALLBELL_HTTP_ERROR",
                "http_status": exc.code,
                "to": normalized_phone,
                "provider": "CALLBELL",
                "response": parsed_body,
            }

        except Exception as exc:
            last_network_error = exc
            print("[WHATSAPP][CALLBELL][NETWORK_RETRY]", _attempt + 1, normalized_phone, str(exc))
            continue

    return {
        "success": False,
        "status": "CALLBELL_ERROR",
        "to": normalized_phone,
        "provider": "CALLBELL",
        "error": str(last_network_error),
    }
