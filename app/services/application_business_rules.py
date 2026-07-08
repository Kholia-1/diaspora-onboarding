PAYMENT_CONFIRMED_VALUES = {
    "PAID",
    "PAYMENT_CONFIRMED",
    "CONFIRMED",
    "CAPTURED",
    "SUCCESS",
}


def payment_required(application) -> bool:
    explicit_required = bool(getattr(application, "selected_package_payment_required", False))

    amount_values = [
        getattr(application, "package_payment_amount", None),
        getattr(application, "selected_package_opening_fee", None),
        getattr(application, "selected_package_subscription_fee", None),
        getattr(application, "selected_package_monthly_fee", None),
    ]

    amount_required = False

    for value in amount_values:
        try:
            if float(value or 0) > 0:
                amount_required = True
                break
        except Exception:
            pass

    package_status = str(getattr(application, "package_payment_status", "") or "").upper()

    if package_status in {"NOT_REQUIRED", "NONE"}:
        return False

    return explicit_required or amount_required


def payment_confirmed(application, payment=None) -> bool:
    app_payment_status = str(getattr(application, "package_payment_status", "") or "").upper()

    if app_payment_status in PAYMENT_CONFIRMED_VALUES:
        return True

    if payment:
        payment_status = str(getattr(payment, "status", "") or "").upper()
        if payment_status in PAYMENT_CONFIRMED_VALUES:
            return True

    return False


def can_open_account(application, payment=None):
    if not payment_required(application):
        return True, "Paiement non requis."

    if payment_confirmed(application, payment):
        return True, "Paiement confirmé."

    return False, "Ouverture impossible : paiement package requis mais non confirmé."
