import os
import httpx


# URL du service BLACKMODULE — obligatoirement définie en variable d'environnement.
#
# Développement local (sans BlackModule) : laisser vide ou ne pas définir →
#   l'appel échouera proprement et retournera BLACKMODULE_UNAVAILABLE (fail-safe).
#
# Production : définir dans les variables d'environnement du serveur / Docker :
#   BLACKMODULE_SCREENING_URL=https://blackmodule.afriland.internal/api/matching/screen
#
# Ne jamais mettre une URL de prod en dur dans ce fichier.
_DEFAULT_URL = ""  # vide par défaut : force la variable d'env en production

BLACKMODULE_SCREENING_URL = os.getenv(
    "BLACKMODULE_SCREENING_URL",
    _DEFAULT_URL
)


async def screen_client_with_blackmodule(payload: dict):
    """
    Connecteur externe vers BLACKMODULE.

    Si BLACKMODULE_SCREENING_URL n'est pas définie → retourne
    BLACKMODULE_UNAVAILABLE immédiatement (fail-safe, sans exception).
    Le dossier passe alors en COMPLIANCE_REVIEW pour revue humaine.
    """
    if not BLACKMODULE_SCREENING_URL:
        return {
            "status": "BLACKMODULE_UNAVAILABLE",
            "score": 0,
            "risk_level": "A_VERIFIER",
            "alert": "Variable BLACKMODULE_SCREENING_URL non configurée — revue manuelle requise."
        }

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