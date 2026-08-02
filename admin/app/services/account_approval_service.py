from app.authentication.supabase_clients import get_service_client
from app.middleware.audit import log_admin_action
from app.repositories import account_approval_repository as repo


def list_by_status(*, status: str, page: int):
    return repo.list_by_status(status=status, page=page)


def _notify(user_id: str, title: str, body: str) -> None:
    client = get_service_client()
    client.table("notifications").insert(
        {"user_id": user_id, "title": title, "body": body, "type": "account_approval"}
    ).execute()


def approve(user_id: str, admin_id: str) -> None:
    repo.approve(user_id, admin_id)
    _notify(user_id, "Account approved", "Your account has been approved. You can now sign in.")
    log_admin_action(admin_id=admin_id, action="account.approved", entity_table="profiles", entity_id=user_id)


def reject(user_id: str, admin_id: str, reason: str) -> None:
    repo.reject(user_id, admin_id, reason)
    _notify(
        user_id,
        "Account not approved",
        f"Your account verification was rejected: {reason}",
    )
    log_admin_action(
        admin_id=admin_id, action="account.rejected", entity_table="profiles", entity_id=user_id, metadata={"reason": reason}
    )
