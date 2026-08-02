from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def list_logs(
    *,
    admin_id: str | None = None,
    action: str | None = None,
    entity_table: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    query = client.table("audit_logs").select("*, administrator_accounts(full_name)", count="exact")
    if admin_id:
        query = query.eq("actor_admin_id", admin_id)
    if action:
        query = query.ilike("action", f"%{action}%")
    if entity_table:
        query = query.eq("entity_table", entity_table)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)

    result = query.order("created_at", desc=True).range(start, end).execute()
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def recent(limit: int = 10) -> list[dict]:
    client = get_service_client()
    result = (
        client.table("audit_logs")
        .select("*, administrator_accounts(full_name)")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def list_administrators() -> list[dict]:
    client = get_service_client()
    result = client.table("administrator_accounts").select("id, full_name").order("full_name").execute()
    return result.data or []
