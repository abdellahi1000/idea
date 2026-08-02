from datetime import UTC, datetime

from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def list_by_status(*, status: str, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    result = (
        client.table("profiles")
        .select("id, full_name, phone, email, approval_status, approval_rejection_reason, created_at", count="exact")
        .eq("approval_status", status)
        .order("created_at", desc=True)
        .range(start, end)
        .execute()
    )
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def get(user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("profiles")
        .select("id, full_name, phone, email, approval_status, approval_rejection_reason, created_at")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def approve(user_id: str, admin_id: str) -> None:
    client = get_service_client()
    client.table("profiles").update(
        {
            "approval_status": "approved",
            "approved_by": admin_id,
            "approved_at": datetime.now(UTC).isoformat(),
            "approval_rejection_reason": None,
        }
    ).eq("id", user_id).execute()


def reject(user_id: str, admin_id: str, reason: str) -> None:
    client = get_service_client()
    client.table("profiles").update(
        {"approval_status": "rejected", "approved_by": admin_id, "approval_rejection_reason": reason}
    ).eq("id", user_id).execute()
