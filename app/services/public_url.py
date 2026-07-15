import os


# Valeur par défaut historique, conservée pour ne rien casser sur les
# déploiements qui n'ont pas encore défini PUBLIC_BASE_URL.
DEFAULT_PUBLIC_BASE_URL = "https://diaspora-onboarding.com"


def public_base_url() -> str:
    """Base URL publique de l'application.

    Utilisée pour construire les liens auto-référents (lien de paiement
    Mastercard, retours de checkout, etc.). Configurable via la variable
    d'environnement ``PUBLIC_BASE_URL`` (chargée depuis le fichier ``.env``).
    À défaut, retombe sur la valeur par défaut historique.
    """
    base = (os.getenv("PUBLIC_BASE_URL") or DEFAULT_PUBLIC_BASE_URL).strip()
    return base.rstrip("/")


def to_absolute_url(path_or_url):
    """Rend une URL absolue à partir d'un chemin relatif.

    Si ``path_or_url`` est déjà absolu (http/https), il est renvoyé tel quel.
    Sinon il est préfixé par :func:`public_base_url`.
    """
    if not path_or_url:
        return None

    value = str(path_or_url).strip()

    if value.startswith("http://") or value.startswith("https://"):
        return value

    if not value.startswith("/"):
        value = "/" + value

    return public_base_url() + value
