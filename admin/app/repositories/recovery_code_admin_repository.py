"""Admin-side recovery-code visibility. Never selects code_encrypted - the
actual code is never readable here, only whether one exists and whether a
one-time view is currently granted."""

from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def list_users_with_status(*, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    result = (
        client.table("profiles")
        .select("id, full_name, phone", count="exact")
        .order("full_name")
        .range(start, end)
        .execute()
    )
    rows = result.data or []
    user_ids = [row["id"] for row in rows]

    # security_recovery_codes_status filters by auth.uid(), which is null
    # for service-role queries (no per-request user context) - it always
    # returns zero rows here regardless of actual data. Query the base
    # table directly instead, selecting only user_id and the permission
    # flag - code_encrypted is never selected, so the actual code stays
    # unreadable either way.
    status_by_user: dict[str, bool] = {}
    if user_ids:
        codes = (
            client.table("security_recovery_codes")
            .select("user_id, one_time_view_allowed")
            .in_("user_id", user_ids)
            .execute()
            .data
            or []
        )
        status_by_user = {row["user_id"]: row["one_time_view_allowed"] for row in codes}

    for row in rows:
        row["has_code"] = row["id"] in status_by_user
        row["view_pending"] = status_by_user.get(row["id"], False)

    return Page(items=rows, page=page, page_size=page_size, total=result.count or 0)


def reset(user_id: str, admin_id: str) -> None:
    client = get_service_client()
    client.rpc("admin_reset_recovery_code", {"p_user_id": user_id, "p_admin_id": admin_id}).execute()


def grant_one_time_view(user_id: str, admin_id: str) -> None:
    client = get_service_client()
    client.rpc(
        "admin_grant_one_time_recovery_view", {"p_user_id": user_id, "p_admin_id": admin_id}
    ).execute()
