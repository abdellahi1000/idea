from app.repositories import recovery_code_admin_repository as repo


def list_users_with_status(*, page: int):
    return repo.list_users_with_status(page=page)


def reset(user_id: str, admin_id: str) -> None:
    # admin_reset_recovery_code() writes its own audit_logs row atomically
    # with the delete, so no separate log_admin_action() call here (avoids
    # double-logging, same pattern as balance_service.py).
    repo.reset(user_id, admin_id)


def grant_one_time_view(user_id: str, admin_id: str) -> None:
    # admin_grant_one_time_recovery_view() self-logs and notifies the user,
    # same reasoning as reset() above.
    repo.grant_one_time_view(user_id, admin_id)
