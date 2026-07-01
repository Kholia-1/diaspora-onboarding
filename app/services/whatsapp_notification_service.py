import json
from pathlib import Path
import urllib.request
import urllib.error


CONFIG_PATH = Path("data/api_integrations.json")


def load_whatsapp_config():
    if not CONFIG_PATH.exists():
        return None

    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

    for item in data.get("integrations", []):
        if str(item.get("code", "")).upper() == "WHATSAPP":
            return item

    return None


def whatsapp_event_message(event_type: str, context: dict):
    event_type = str(event_type or "").upper()

    full_name = context.get("full_name") or "Cher client"
    reference = context.get("reference") or context.get("application_reference") or ""
    payment_url = context.get("payment_url") or ""
    account_number = context.get("account_number") or ""
    final_rib = context.get("final_rib") or ""

    if event_type == "DOSSIER_SOUMIS":
        return f"Bonjour {full_name}, votre dossier d’ouverture de compte diaspora {reference} a été soumis avec succès."

    if event_type == "DOSSIER_APPROUVE":
        return f"Bonjour {full_name}, votre dossier {reference} a été approuvé par la banque."

    if event_type == "LIEN_PAIEMENT":
        return f"Bonjour {full_name}, votre dossier {reference} est approuvé. Veuillez procéder au paiement de votre package ici : {payment_url}"

    if event_type == "PAIEMENT_CONFIRME":
        return f"Bonjour {full_name}, le paiement lié à votre dossier {reference} a été confirmé."

    if event_type == "COMPTE_OUVERT":
        msg = f"Bonjour {full_name}, votre compte lié au dossier {reference} est ouvert."
        if account_number:
            msg += f" Numéro de compte : {account_number}."
        if final_rib:
            msg += f" RIB : {final_rib}."
        return msg

    if event_type == "COMPLEMENT_DOCUMENTAIRE":
        return f"Bonjour {full_name}, un complément documentaire est demandé pour votre dossier {reference}. Veuillez consulter votre suivi client."

    return f"Bonjour {full_name}, une mise à jour est disponible pour votre dossier {reference}."


def build_callbell_payload(config: dict, phone: str, message: str, context: dict):
    return {
        "provider": "CALLBELL",
        "to": phone,
        "channel_uuid": config.get("phone_number_id") or "",
        "template_uuid": config.get("business_account_id") or "",
        "message": message,
        "context": context,
    }


def validate_whatsapp_config(config: dict):
    if not config:
        return ["Configuration WhatsApp introuvable."]

    missing = []

    if not config.get("enabled"):
        missing.append("Intégration WhatsApp désactivée.")

    if not config.get("base_url"):
        missing.append("Base URL manquante.")

    if not config.get("api_key"):
        missing.append("Bearer Token / API Key manquant.")

    if not config.get("phone_number_id"):
        missing.append("Channel UUID manquant.")

    return missing


def send_whatsapp_notification(phone: str, event_type: str, context: dict, dry_run: bool = True):
    """
    Envoi WhatsApp via provider configurable.

    Par défaut dry_run=True :
    - aucun message réel n'est envoyé
    - on retourne seulement le message et le payload préparés

    Pour un vrai envoi plus tard :
    - activer WhatsApp dans /backoffice/api-integrations
    - renseigner les paramètres Callbell
    - appeler avec dry_run=False
    """

    config = load_whatsapp_config()

    if not phone:
        return {
            "success": False,
            "status": "MISSING_PHONE",
            "message": "Numéro WhatsApp client manquant."
        }

    message = whatsapp_event_message(event_type, context or {})
    payload = build_callbell_payload(config or {}, phone, message, context or {})

    missing = validate_whatsapp_config(config)

    if dry_run:
        return {
            "success": True,
            "status": "DRY_RUN",
            "message": "Simulation WhatsApp préparée. Aucun message réel envoyé.",
            "event_type": event_type,
            "phone": phone,
            "prepared_message": message,
            "payload": payload,
            "config_warnings": missing
        }

    if missing:
        return {
            "success": False,
            "status": "CONFIG_INCOMPLETE",
            "message": "Configuration WhatsApp incomplète.",
            "missing": missing,
            "payload": payload
        }

    base_url = str(config.get("base_url") or "").rstrip("/")

    # Endpoint par défaut Callbell pour la démonstration.
    # Si besoin, la banque pourra remplacer cette URL dans le service selon la documentation Callbell validée.
    endpoint = base_url + "/v1/messages/send"

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + str(config.get("api_key") or ""),
            "User-Agent": "Diaspora-Onboarding-WhatsApp/1.0"
        }
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8", errors="replace")

            return {
                "success": True,
                "status": "SENT",
                "http_status": response.status,
                "message": "Message WhatsApp envoyé via Callbell.",
                "response": raw
            }

    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")

        return {
            "success": False,
            "status": "HTTP_ERROR",
            "http_status": exc.code,
            "message": "Erreur HTTP lors de l’envoi WhatsApp.",
            "response": raw
        }

    except Exception as exc:
        return {
            "success": False,
            "status": "SEND_FAILED",
            "message": str(exc)
        }
