from uuid import uuid4


def build_payment_reference() -> str:
    return "PAY-" + uuid4().hex[:12].upper()


def calculate_package_amount(application) -> float:
    """
    Montant à payer pour le package.
    Pour la souscription initiale, on additionne :
    - frais d'ouverture
    - frais de souscription

    Les frais mensuels sont conservés comme information tarifaire,
    mais ne sont pas encaissés immédiatement ici.
    """

    opening_fee = float(getattr(application, "selected_package_opening_fee", 0) or 0)
    subscription_fee = float(getattr(application, "selected_package_subscription_fee", 0) or 0)

    return opening_fee + subscription_fee


def create_mastercard_payment_session(payment):
    """
    SERVICE PROVISOIRE.

    Ici, on prépare le point d’intégration Mastercard.
    Plus tard, cette fonction devra appeler la vraie passerelle Mastercard
    avec les identifiants fournis par la banque.

    Pour la démonstration, on retourne une URL interne simulée.
    """

    payment_url = f"/api/payments/{payment.payment_reference}/simulate-page"

    return {
        "provider": "MASTERCARD",
        "provider_transaction_id": "SIM-" + uuid4().hex[:10].upper(),
        "payment_url": payment_url,
        "raw_response": {
            "mode": "SIMULATION",
            "message": "Session Mastercard simulée créée avec succès."
        }
    }
