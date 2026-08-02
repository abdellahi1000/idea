from datetime import UTC, datetime

from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def list_locked_accounts(*, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    result = (
        client.table("profiles")
        .select("id, full_name, phone, status", count="exact")
        .eq("status", "locked")
        .order("full_name")
        .range(start, end)
        .execute()
    )
    rows = result.data or []

    user_ids = [row["id"] for row in rows]
    latest_lock_by_user: dict[str, dict] = {}
    if user_ids:
        locks = (
            client.table("account_locks")
            .select("*")
            .in_("user_id", user_ids)
            .is_("unlocked_at", "null")
            .order("locked_at", desc=True)
            .execute()
            .data
            or []
        )
        for lock in locks:
            latest_lock_by_user.setdefault(lock["user_id"], lock)

    for row in rows:
        row["lock"] = latest_lock_by_user.get(row["id"])

    return Page(items=rows, page=page, page_size=page_size, total=result.count or 0)


def lock_account(user_id: str, admin_id: str, reason: str) -> None:
    client = get_service_client()
    client.table("profiles").update({"status": "locked"}).eq("id", user_id).execute()
    client.table("account_locks").insert(
        {"user_id": user_id, "reason": reason, "locked_by": admin_id}
    ).execute()


def unlock_account(user_id: str, admin_id: str) -> None:
    client = get_service_client()
    client.table("profiles").update({"status": "active"}).eq("id", user_id).execute()
    client.table("account_locks").update(
        {"unlocked_at": datetime.now(UTC).isoformat(), "unlocked_by": admin_id}
    ).eq("user_id", user_id).is_("unlocked_at", "null").execute()
