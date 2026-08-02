from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def list_requests(*, status: str | None = "pending", page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    query = client.table("device_transfer_requests").select(
        "*, profiles(full_name, phone)", count="exact"
    )
    if status:
        query = query.eq("status", status)

    result = query.order("requested_at", desc=True).range(start, end).execute()
    rows = result.data or []

    device_ids = [
        device_id
        for row in rows
        for device_id in (row.get("from_device_id"), row.get("to_device_id"))
        if device_id
    ]
    devices_by_id: dict[str, dict] = {}
    if device_ids:
        devices = client.table("devices").select("id, device_name").in_("id", device_ids).execute().data or []
        devices_by_id = {device["id"]: device for device in devices}

    for row in rows:
        row["from_device"] = devices_by_id.get(row.get("from_device_id"))
        row["to_device"] = devices_by_id.get(row.get("to_device_id"))

    return Page(items=rows, page=page, page_size=page_size, total=result.count or 0)


def resolve(request_id: str, admin_id: str, *, approve: bool, reason: str | None = None) -> None:
    client = get_service_client()
    client.rpc(
        "admin_resolve_device_transfer",
        {
            "p_request_id": request_id,
            "p_admin_id": admin_id,
            "p_approve": approve,
            "p_reason": reason,
        },
    ).execute()
