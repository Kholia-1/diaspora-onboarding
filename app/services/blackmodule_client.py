import os
import httpx


BLACKMODULE_SCREENING_URL = os.getenv(
    "BLACKMODULE_SCREENING_URL",
    "http://127.0.0.1:8000/api/matching/screen"
)


async def screen_client_with_blackmodule(payload: dict):
    """
    Connecteur externe vers BLACKMODULE.

    La plateforme diaspora reste indépendante.
    BLACKMODULE sera appelé par API.
    """

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(BLACKMODULE_SCREENING_URL, json=payload)

        if response.status_code >= 400:
            return {
                "status": "BLACKMODULE_ERROR",
                "score": 0,
                "risk_level": "A_VERIFIER",
                "alert": f"Erreur BLACKMODULE HTTP {response.status_code}"
            }

        data = response.json()

        return {
            "status": data.get("status", "SCREENED"),
            "score": data.get("score", 0),
            "risk_level": data.get("risk_level", "FAIBLE"),
            "alert": data.get("alert") or data.get("message")
        }

    except Exception as e:
        return {
            "status": "BLACKMODULE_UNAVAILABLE",
            "score": 0,
            "risk_level": "A_VERIFIER",
            "alert": f"BLACKMODULE indisponible : {str(e)}"
        }