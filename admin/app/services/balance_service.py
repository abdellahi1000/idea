from app.middleware.audit import log_admin_action
from app.repositories import balance_repository as repo


def get_wallet(wallet_id: str):
    return repo.get_wallet(wallet_id)


def adjust_balance(wallet_id: str, amount_delta: float, reason: str, admin_id: str) -> dict:
    wallet = repo.adjust_balance(wallet_id, amount_delta, reason, admin_id)
    # admin_adjust_balance() already writes its own audit_logs row atomically
    # with the balance change (see the migration) - no separate
    # log_admin_action() call here to avoid double-logging.
    return wallet
