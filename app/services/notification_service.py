import json
import logging
import os
import smtplib
import ssl
import urllib.request
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

logger = logging.getLogger(__name__)

NOTIFICATION_LOG_PATH = Path("data/notifications.log")


def _now():
    return datetime.utcnow().isoformat() + "Z"


def _safe(value):
    if value is None:
        return ""
    return str(value).strip()


def _log_notification(channel, recipient, subject, message, status, detail=None):
    NOTIFICATION_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "created_at": _now(),
        "channel": channel,
        "recipient": recipient,
        "subject": subject,
        "message": message,
        "status": status,
        "detail": detail or "",
    }

    with NOTIFICATION_LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")

    logger.info("Notification %s vers %s : %s", channel, recipient, status)


# EMAIL_BRANDED_HTML_V1 — logo Afriland intégré (image inline CID) + mise en forme.
EMAIL_LOGO_PATH = Path("app/static/afriland-logo.png")


def _escape_html(value):
    return (
        _safe(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _build_branded_html(message, logo_cid):
    paragraphs = "".join(
        f'<p style="margin:0 0 14px;color:#1f2937;font-size:15px;line-height:1.65;">{_escape_html(p)}</p>'
        for p in _safe(message).split("\n") if p.strip()
    )

    logo_html = ""
    if logo_cid:
        logo_html = (
            f'<img src="cid:{logo_cid}" alt="Afriland First Bank" '
            'style="max-width:200px;height:auto;display:block;">'
        )

    return f"""\
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:20px 26px;background:#ffffff;border-bottom:4px solid #C90000;">
        {logo_html}
      </div>
      <div style="padding:26px;">
        {paragraphs}
      </div>
      <div style="padding:16px 26px;background:#f4f6f9;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#6b7280;font-size:12px;">
          Afriland First Bank — Portail digital Diaspora Onboarding.<br>
          Ce message est envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
"""


def send_email_notification(to_email, subject, message):
    to_email = _safe(to_email)

    if not to_email:
        _log_notification("EMAIL", "", subject, message, "SKIPPED", "Aucune adresse email client.")
        return False

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM") or smtp_user
    smtp_tls = os.getenv("SMTP_TLS", "true").lower() != "false"

    if not smtp_host or not smtp_from:
        _log_notification(
            "EMAIL",
            to_email,
            subject,
            message,
            "SIMULATED",
            "SMTP non configuré. Notification email simulée."
        )
        return True

    try:
        email = EmailMessage()
        email["From"] = smtp_from
        email["To"] = to_email
        email["Subject"] = subject
        email.set_content(message)

        # EMAIL_BRANDED_HTML_V1 : version HTML avec le logo de la banque en image
        # inline (CID). Le texte brut ci-dessus reste le repli des clients mail.
        logo_cid = None
        logo_bytes = None
        if EMAIL_LOGO_PATH.exists():
            logo_bytes = EMAIL_LOGO_PATH.read_bytes()
            logo_cid = "afriland-logo"

        email.add_alternative(_build_branded_html(message, logo_cid), subtype="html")

        if logo_bytes:
            email.get_payload()[-1].add_related(
                logo_bytes,
                maintype="image",
                subtype="png",
                cid=f"<{logo_cid}>",
            )

        if smtp_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls(context=context)
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.send_message(email)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.send_message(email)

        _log_notification("EMAIL", to_email, subject, message, "SENT")
        return True

    except Exception as exc:
        _log_notification("EMAIL", to_email, subject, message, "FAILED", str(exc))
        return False


def _normalize_phone(phone):
    phone = _safe(phone)
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    if phone.startswith("+"):
        return phone[1:]

    if phone.startswith("00"):
        return phone[2:]

    return phone


def send_whatsapp_notification(phone, message):
    phone = _normalize_phone(phone)

    if not phone:
        _log_notification("WHATSAPP", "", "WhatsApp", message, "SKIPPED", "Aucun numéro client.")
        return False

    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    api_version = os.getenv("WHATSAPP_API_VERSION", "v20.0")

    if not access_token or not phone_number_id:
        _log_notification(
            "WHATSAPP",
            phone,
            "WhatsApp",
            message,
            "SIMULATED",
            "WhatsApp Business API non configurée. Notification WhatsApp simulée."
        )
        return True

    url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message
        }
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )

        with urllib.request.urlopen(request, timeout=15) as response:
            result = response.read().decode("utf-8")

        _log_notification("WHATSAPP", phone, "WhatsApp", message, "SENT", result)
        return True

    except Exception as exc:
        _log_notification("WHATSAPP", phone, "WhatsApp", message, "FAILED", str(exc))
        return False


def _status_label(status):
    labels = {
        "SUBMITTED": "Soumise",
        "PENDING": "En attente",
        "UNDER_REVIEW": "En cours d'analyse",
        "COMPLIANCE_REVIEW": "En revue conformité",
        "NEED_MORE_DOCUMENTS": "Documents complémentaires requis",
        "APPROVED": "Approuvée",
        "REJECTED": "Rejetée",
        "ACCOUNT_OPENED": "Compte ouvert",
    }
    return labels.get(_safe(status), _safe(status) or "En cours")


def notify_application_submitted(application):
    reference = _safe(getattr(application, "reference", ""))
    first_name = _safe(getattr(application, "first_name", ""))
    last_name = _safe(getattr(application, "last_name", ""))
    email = _safe(getattr(application, "email", ""))
    phone = _safe(getattr(application, "phone", ""))

    subject = f"Demande d'ouverture de compte reçue - {reference}"

    message = (
        f"Bonjour {first_name} {last_name},\n\n"
        f"Votre demande d'ouverture de compte a bien été reçue.\n"
        f"Référence dossier : {reference}\n\n"
        f"Nos équipes vont analyser vos informations et vos documents.\n"
        f"Vous serez notifié à chaque évolution du statut de votre dossier.\n\n"
        f"Afriland First Bank - Diaspora Onboarding"
    )

    send_email_notification(email, subject, message)
    send_whatsapp_notification(phone, message)


def notify_application_status_changed(application):
    reference = _safe(getattr(application, "reference", ""))
    first_name = _safe(getattr(application, "first_name", ""))
    last_name = _safe(getattr(application, "last_name", ""))
    email = _safe(getattr(application, "email", ""))
    phone = _safe(getattr(application, "phone", ""))
    status = _safe(getattr(application, "status", ""))
    review_decision = _safe(getattr(application, "review_decision", ""))
    review_comment = _safe(getattr(application, "review_comment", ""))
    client_message = _safe(getattr(application, "client_message", ""))
    final_rib = _safe(getattr(application, "final_rib", ""))
    account_number = _safe(getattr(application, "account_number", ""))

    visible_status = _status_label(status or review_decision)

    subject = f"Mise à jour de votre dossier - {reference}"

    message = (
        f"Bonjour {first_name} {last_name},\n\n"
        f"Le statut de votre demande d'ouverture de compte a été mis à jour.\n\n"
        f"Référence dossier : {reference}\n"
        f"Nouveau statut : {visible_status}\n"
    )

    if client_message:
        message += f"\nMessage de la banque : {client_message}\n"
    elif review_comment:
        message += f"\nCommentaire : {review_comment}\n"

    if status == "ACCOUNT_OPENED":
        if account_number:
            message += f"\nNuméro de compte : {account_number}\n"
        if final_rib:
            message += f"RIB : {final_rib}\n"

    message += "\nAfriland First Bank - Diaspora Onboarding"

    send_email_notification(email, subject, message)
    send_whatsapp_notification(phone, message)
