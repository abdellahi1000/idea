from datetime import UTC, datetime

from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def create(full_name: str, email: str, reason: str | None) -> None:
    client = get_service_client()
    client.table("admin_access_requests").insert(
        {"full_name": full_name, "email": email, "reason": reason}
    ).execute()


def list_pending(*, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)
    result = (
        client.table("admin_access_requests")
        .select("*", count="exact")
        .eq("status", "pending")
        .order("requested_at", desc=True)
        .range(start, end)
        .execute()
    )
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def get(request_id: str) -> dict | None:
    client = get_service_client()
    result = client.table("admin_access_requests").select("*").eq("id", request_id).maybe_single().execute()
    return result.data if result else None


def mark_resolved(request_id: str, status: str, admin_id: str) -> None:
    client = get_service_client()
    client.table("admin_access_requests").update(
        {"status": status, "resolved_by": admin_id, "resolved_at": datetime.now(UTC).isoformat()}
    ).eq("id", request_id).execute()
