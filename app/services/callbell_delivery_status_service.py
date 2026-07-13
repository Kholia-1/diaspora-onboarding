import json
import os
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path("data")
API_FILE = DATA_DIR / "api_integrations.json"
CALLBELL_FILE = DATA_DIR / "callbell_settings.json"
LOG_FILE = DATA_DIR / "notifications.log"


def _integration_items(data: Any):
    if isinstance(data, dict):
        return data.get("integrations") or data.get("items") or data.get("api_integrations") or []
    if isinstance(data, list):
        return data
    return []


def get_callbell_runtime_config() -> Dict[str, Any]:
    token = (
        os.getenv("CALLBELL_API_TOKEN")
        or os.getenv("CALLBELL_TOKEN")
        or os.getenv("CALLBELL_BEARER_TOKEN")
        or ""
    ).strip()

    base_url = (os.getenv("CALLBELL_BASE_URL") or "https://api.callbell.eu").strip().rstrip("/")

    if not token and API_FILE.exists():
        try:
            data = json.loads(API_FILE.read_text(encoding="utf-8"))
            for item in _integration_items(data):
                code = str(item.get("code") or "").upper()
                provider = str(item.get("provider") or "").upper()

                if code == "WHATSAPP_CALLBELL" or provider == "CALLBELL":
                    token = str(
                        item.get("api_key")
                        or item.get("token")
                        or item.get("bearer_token")
                        or item.get("access_token")
                        or ""
                    ).strip()

                    base_url = str(item.get("base_url") or base_url).strip().rstrip("/")
                    break
        except Exception:
            pass

    if not token and CALLBELL_FILE.exists():
        try:
            data = json.loads(CALLBELL_FILE.read_text(encoding="utf-8"))
            token = str(data.get("api_token") or data.get("token") or "").strip()
            base_url = str(data.get("base_url") or base_url).strip().rstrip("/")
        except Exception:
            pass

    return {
        "base_url": base_url,
        "token_configured": bool(token),
        "token": token,
    }


def get_callbell_message_status(uuid: str) -> Dict[str, Any]:
    cfg = get_callbell_runtime_config()

    if not cfg["token_configured"]:
        return {
            "success": False,
            "http_status": None,
            "status": "CONFIG_MISSING",
            "error": "Token Callbell introuvable.",
        }

    base_url = cfg["base_url"]
    url = (
        f"{base_url}/messages/status/{uuid}"
        if base_url.endswith("/v1")
        else f"{base_url}/v1/messages/status/{uuid}"
    )

    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {cfg['token']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; DiasporaOnboarding/1.0)",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(body) if body else {}

            message = parsed.get("message") or {}
            payload = message.get("messageStatusPayload") or {}
            errors = []

            try:
                statuses = (
                    payload.get("messaging", {})
                    .get("value", {})
                    .get("statuses", [])
                )
                for st in statuses or []:
                    for err in st.get("errors") or []:
                        errors.append({
                            "code": err.get("code"),
                            "title": err.get("title"),
                            "message": err.get("message"),
                            "details": (err.get("error_data") or {}).get("details"),
                        })
            except Exception:
                pass

            return {
                "success": True,
                "http_status": resp.status,
                "uuid": uuid,
                "status": message.get("status"),
                "errors": errors,
                "metadata": message.get("metadata") or {},
                "conversation_href": (message.get("conversation") or {}).get("href"),
                "contact": {
                    "name": (message.get("contact") or {}).get("name"),
                    "phoneNumber": (message.get("contact") or {}).get("phoneNumber"),
                },
            }

    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = raw

        return {
            "success": False,
            "http_status": e.code,
            "uuid": uuid,
            "status": "HTTP_ERROR",
            "response": parsed,
        }

    except Exception as e:
        return {
            "success": False,
            "http_status": None,
            "uuid": uuid,
            "status": "ERROR",
            "error": str(e),
        }


def list_callbell_messages(reference: Optional[str] = None, limit: int = 10, refresh: bool = False) -> List[Dict[str, Any]]:
    if not LOG_FILE.exists():
        return []

    rows: List[Dict[str, Any]] = []

    for line in LOG_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue

        try:
            item = json.loads(line)
        except Exception:
            continue

        if item.get("event") != "callbell_sent":
            continue

        response = item.get("response") or {}
        message = response.get("message") or {}
        metadata = message.get("metadata") or {}

        if reference and str(metadata.get("reference") or "") != str(reference):
            continue

        uuid = message.get("uuid")

        row = {
            "created_at": item.get("created_at"),
            "to": item.get("to"),
            "uuid": uuid,
            "event_type": metadata.get("event_type"),
            "reference": metadata.get("reference"),
            "initial_status": message.get("status"),
            "delivery_status": message.get("status"),
            "errors": [],
        }

        if refresh and uuid:
            live = get_callbell_message_status(uuid)
            row["delivery_status"] = live.get("status") or row["delivery_status"]
            row["errors"] = live.get("errors") or []
            row["live_status"] = live

        rows.append(row)

    return rows[-limit:]
