from app.repositories import audit_log_repository as repo


def list_logs(*, admin_id, action, entity_table, date_from, date_to, page):
    return repo.list_logs(
        admin_id=admin_id, action=action, entity_table=entity_table, date_from=date_from, date_to=date_to, page=page
    )


def recent(limit: int = 10):
    return repo.recent(limit)


def list_administrators():
    return repo.list_administrators()
