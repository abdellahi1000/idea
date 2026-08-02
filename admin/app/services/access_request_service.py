import re

import httpx
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError, AuthRetryableError, AuthWeakPasswordError

from app.authentication.login_manager import AdminUser
from app.authentication.supabase_clients import get_service_client
from app.middleware.audit import log_admin_action
from app.repositories import access_request_repository as repo

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AccessRequestError(Exception):
    """Raised for any signup failure. Always carries a single user-friendly
    message - never a raw provider/database error string."""


def submit_request(full_name: str, email: str, reason: str | None) -> None:
    if not full_name.strip() or not email.strip():
        raise AccessRequestError("Full name and email are required.")
    repo.create(full_name.strip(), email.strip().lower(), (reason or "").strip() or None)


def sign_up(full_name: str, email: str, password: str, confirm_password: str) -> AdminUser:
    """Direct self-service account creation: no admin review step. Every
    account created this way gets super_administrator access immediately."""
    full_name = full_name.strip()
    email = email.strip().lower()

    if not full_name:
        raise AccessRequestError("Full name is required.")
    if not email or not EMAIL_PATTERN.match(email):
        raise AccessRequestError("Please enter a valid email address.")
    if len(password) < 8:
        raise AccessRequestError("Password must be at least 8 characters long.")
    if password != confirm_password:
        raise AccessRequestError("Passwords do not match.")

    client = get_service_client()

    try:
        created = client.auth.admin.create_user(
            {"email": email, "password": password, "email_confirm": True}
        )
    except AuthWeakPasswordError:
        raise AccessRequestError(
            "That password is too weak. Use at least 8 characters with a mix of letters and numbers."
        ) from None
    except AuthApiError as error:
        if error.code in ("email_exists", "user_already_exists"):
            raise AccessRequestError("An account with this email already exists.") from None
        if error.code == "validation_failed":
            raise AccessRequestError("Please enter a valid email address.") from None
        if error.code == "weak_password":
            raise AccessRequestError(
                "That password is too weak. Use at least 8 characters with a mix of letters and numbers."
            ) from None
        raise AccessRequestError("We couldn't create your account. Please try again.") from None
    except (AuthRetryableError, httpx.ConnectError, httpx.TimeoutException):
        raise AccessRequestError(
            "We couldn't reach the authentication service. Check your connection and try again."
        ) from None

    user_id = created.user.id

    try:
        client.table("administrator_accounts").upsert(
            {"id": user_id, "email": email, "full_name": full_name, "role": "super_administrator", "status": "active"}
        ).execute()
    except APIError as error:
        if error.code == "PGRST205":
            raise AccessRequestError(
                "The admin database isn't set up yet. Please contact your system administrator."
            ) from None
        raise AccessRequestError("We couldn't finish setting up your account. Please try again.") from None
    except (httpx.ConnectError, httpx.TimeoutException):
        raise AccessRequestError(
            "We couldn't reach the database. Check your connection and try again."
        ) from None

    log_admin_action(
        admin_id=user_id,
        action="administrator_account.self_signed_up",
        entity_table="administrator_accounts",
        entity_id=user_id,
    )

    return AdminUser(id=user_id, email=email, full_name=full_name, role="super_administrator")


def list_pending(*, page: int):
    return repo.list_pending(page=page)


def approve_request(request_id: str, role: str, admin_id: str) -> None:
    request = repo.get(request_id)
    if not request or request["status"] != "pending":
        raise AccessRequestError("Request not found or already resolved.")

    client = get_service_client()

    # Sends Supabase's own invite email so the new admin sets their own
    # password directly - it never passes through this app or this request.
    invited = client.auth.admin.invite_user_by_email(request["email"])
    user_id = invited.user.id

    client.table("administrator_accounts").upsert(
        {
            "id": user_id,
            "email": request["email"],
            "full_name": request["full_name"],
            "role": role,
            "status": "active",
        }
    ).execute()

    repo.mark_resolved(request_id, "approved", admin_id)

    log_admin_action(
        admin_id=admin_id,
        action="access_request.approved",
        entity_table="admin_access_requests",
        entity_id=request_id,
        metadata={"email": request["email"], "role": role},
    )


def reject_request(request_id: str, admin_id: str) -> None:
    repo.mark_resolved(request_id, "rejected", admin_id)
    log_admin_action(
        admin_id=admin_id, action="access_request.rejected", entity_table="admin_access_requests", entity_id=request_id
    )
