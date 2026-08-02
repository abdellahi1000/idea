from app.middleware.audit import log_admin_action
from app.repositories import account_lock_repository as repo
from app.repositories import user_repository


def list_locked_accounts(*, page: int):
    return repo.list_locked_accounts(page=page)


def lock_account(user_id: str, admin_id: str, reason: str) -> None:
    repo.lock_account(user_id, admin_id, reason)
    log_admin_action(
        admin_id=admin_id, action="user.locked", entity_table="profiles", entity_id=user_id, metadata={"reason": reason}
    )


def unlock_account(user_id: str, admin_id: str) -> None:
    repo.unlock_account(user_id, admin_id)
    log_admin_action(admin_id=admin_id, action="user.unlocked", entity_table="profiles", entity_id=user_id)


def suspend_account(user_id: str, admin_id: str) -> None:
    user_repository.update_status(user_id, "suspended")
    log_admin_action(admin_id=admin_id, action="user.suspended", entity_table="profiles", entity_id=user_id)
