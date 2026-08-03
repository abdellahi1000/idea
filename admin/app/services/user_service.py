from app.middleware.audit import log_admin_action
from app.repositories import user_repository


def list_users(*, search: str | None, page: int):
    return user_repository.list_users(search=search, page=page)


def get_user_detail(user_id: str):
    return user_repository.get_user_detail(user_id)


def get_user_transactions(user_id: str, wallet_id: str | None, page: int):
    return user_repository.get_user_transactions(user_id, wallet_id, page=page)


def suspend_account(user_id: str, admin_id: str) -> None:
    user_repository.update_status(user_id, "suspended")
    log_admin_action(admin_id=admin_id, action="user.suspended", entity_table="profiles", entity_id=user_id)


def activate_account(user_id: str, admin_id: str) -> None:
    user_repository.update_status(user_id, "active")
    log_admin_action(admin_id=admin_id, action="user.activated", entity_table="profiles", entity_id=user_id)


def save_admin_notes(user_id: str, admin_id: str, notes: str) -> None:
    user_repository.update_admin_notes(user_id, notes)
    log_admin_action(admin_id=admin_id, action="user.notes_updated", entity_table="profiles", entity_id=user_id)


def reset_login_pin(user_id: str, admin_id: str) -> None:
    # admin_reset_login_pin() writes its own audit_logs row atomically with
    # the update, so no separate log_admin_action() call here (avoids
    # double-logging, same pattern as recovery_code_service.reset()).
    user_repository.reset_login_pin(user_id, admin_id)
