from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def list_requests(*, status: str | None = "pending", page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    query = client.table("identity_verification").select(
        "*, profiles(full_name, phone)", count="exact"
    )
    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).range(start, end).execute()
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def get_request(request_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("identity_verification")
        .select("*, profiles(full_name, phone)")
        .eq("id", request_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def approve(request_id: str, admin_id: str) -> None:
    client = get_service_client()
    client.table("identity_verification").update(
        {"status": "approved", "reviewed_by": admin_id, "rejection_reason": None}
    ).eq("id", request_id).execute()


def reject(request_id: str, admin_id: str, reason: str) -> None:
    client = get_service_client()
    client.table("identity_verification").update(
        {"status": "rejected", "reviewed_by": admin_id, "rejection_reason": reason}
    ).eq("id", request_id).execute()


def signed_url(path: str, *, expires_in: int = 3600) -> str | None:
    if not path:
        return None
    client = get_service_client()
    result = client.storage.from_("identity-documents").create_signed_url(path, expires_in)
    return result.get("signedURL") or result.get("signedUrl")
