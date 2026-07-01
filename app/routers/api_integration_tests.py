from fastapi import APIRouter, HTTPException
import urllib.request
import urllib.error

from app.routers.backoffice import ensure_api_integrations_config

router = APIRouter(
    prefix="/api/backoffice",
    tags=["Tests intégrations API"]
)


def integration_required_fields(code: str):
    code = str(code or "").upper()

    if code == "WHATSAPP":
        return ["base_url", "api_key", "phone_number_id"]

    if code == "MASTERCARD":
        return ["base_url", "merchant_id"]

    if code == "CORE_BANKING":
        return ["base_url", "auth_type"]

    if code == "BLACKMODULE":
        return ["base_url", "auth_type"]

    if code == "GED":
        return ["base_url", "auth_type"]

    return ["base_url"]


def safe_http_connectivity_test(base_url: str):
    if not base_url:
        return {
            "attempted": False,
            "success": False,
            "message": "Aucune URL de base renseignée."
        }

    if not str(base_url).lower().startswith(("http://", "https://")):
        return {
            "attempted": False,
            "success": False,
            "message": "L’URL doit commencer par http:// ou https://."
        }

    try:
        request = urllib.request.Request(
            base_url,
            method="GET",
            headers={
                "User-Agent": "Diaspora-Onboarding-Integration-Test/1.0"
            }
        )

        with urllib.request.urlopen(request, timeout=5) as response:
            return {
                "attempted": True,
                "success": True,
                "http_status": response.status,
                "message": f"Connexion HTTP réussie avec le statut {response.status}."
            }

    except urllib.error.HTTPError as exc:
        if exc.code in [401, 403, 404, 405]:
            return {
                "attempted": True,
                "success": True,
                "http_status": exc.code,
                "message": f"Le serveur répond avec le statut {exc.code}. L’API est joignable, mais nécessite une authentification ou une route métier précise."
            }

        return {
            "attempted": True,
            "success": False,
            "http_status": exc.code,
            "message": f"Erreur HTTP : {exc.code}."
        }

    except Exception as exc:
        return {
            "attempted": True,
            "success": False,
            "message": f"Connexion impossible : {str(exc)}"
        }


@router.post("/api-integrations/{integration_code}/test")
def test_api_integration_connection(integration_code: str):
    data = ensure_api_integrations_config()
    code = str(integration_code or "").strip().upper()

    integration = None

    for item in data["integrations"]:
        if item["code"] == code:
            integration = item
            break

    if not integration:
        raise HTTPException(status_code=404, detail="Intégration API introuvable.")

    required = integration_required_fields(code)
    missing = []

    for field in required:
        value = str(integration.get(field) or "").strip()

        if not value:
            missing.append(field)

    if not integration.get("enabled"):
        return {
            "code": code,
            "name": integration.get("name"),
            "status": "DISABLED",
            "success": False,
            "message": "Cette intégration est désactivée. Activez-la avant de tester la connexion.",
            "missing_fields": missing,
            "environment": integration.get("environment"),
            "provider": integration.get("provider")
        }

    if missing:
        return {
            "code": code,
            "name": integration.get("name"),
            "status": "CONFIG_INCOMPLETE",
            "success": False,
            "message": "Configuration incomplète. Certains champs obligatoires sont manquants.",
            "missing_fields": missing,
            "environment": integration.get("environment"),
            "provider": integration.get("provider")
        }

    connectivity = safe_http_connectivity_test(integration.get("base_url"))

    return {
        "code": code,
        "name": integration.get("name"),
        "status": "CONNECTION_OK" if connectivity.get("success") else "CONNECTION_FAILED",
        "success": bool(connectivity.get("success")),
        "message": connectivity.get("message"),
        "missing_fields": [],
        "environment": integration.get("environment"),
        "provider": integration.get("provider"),
        "connectivity": connectivity
    }
