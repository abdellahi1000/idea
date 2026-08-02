from app.authentication.login_manager import AdminUser, load_active_admin
from app.authentication.supabase_clients import get_auth_check_client


class LoginError(Exception):
    """Raised for any login failure. Always carries a single generic
    message - never reveals whether the email exists, whether the password
    was wrong, or whether the account lacks admin access."""


GENERIC_LOGIN_ERROR = "Invalid credentials or not authorized."


def authenticate(email: str, password: str) -> AdminUser:
    client = get_auth_check_client()
    try:
        result = client.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as exc:  # noqa: BLE001 - deliberately broad, see docstring
        raise LoginError(GENERIC_LOGIN_ERROR) from exc

    user = result.user if result else None
    if not user:
        raise LoginError(GENERIC_LOGIN_ERROR)

    admin = load_active_admin(user.id)
    if not admin:
        raise LoginError(GENERIC_LOGIN_ERROR)

    return admin
