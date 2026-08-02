from app.repositories import audit_log_repository, dashboard_repository


def get_dashboard_data() -> dict:
    return {
        "stats": dashboard_repository.get_stats(),
        "recent_activity": audit_log_repository.recent(limit=10),
    }
