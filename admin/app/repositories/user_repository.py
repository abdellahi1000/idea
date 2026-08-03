from typing import Any

from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def _latest_verification_status_by_user(user_ids: list[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    client = get_service_client()
    rows = (
        client.table("identity_verification")
        .select("user_id, status, created_at")
        .in_("user_id", user_ids)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    latest: dict[str, str] = {}
    for row in rows:
        latest.setdefault(row["user_id"], row["status"])
    return latest


def list_users(*, search: str | None = None, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    query = client.table("profiles").select(
        "id, full_name, phone, status, created_at, wallets(balance, currency_code), devices(last_login_at)",
        count="exact",
    )
    if search:
        query = query.or_(f"full_name.ilike.%{search}%,phone.ilike.%{search}%")

    result = query.order("created_at", desc=True).range(start, end).execute()
    rows = result.data or []

    verification_by_user = _latest_verification_status_by_user([row["id"] for row in rows])

    items = []
    for row in rows:
        wallets = row.get("wallets") or []
        devices = row.get("devices") or []
        last_login = max(
            (device["last_login_at"] for device in devices if device.get("last_login_at")),
            default=None,
        )
        items.append(
            {
                "id": row["id"],
                "full_name": row["full_name"],
                "phone": row["phone"],
                "status": row["status"],
                "created_at": row["created_at"],
                "balance": wallets[0]["balance"] if wallets else None,
                "currency_code": wallets[0]["currency_code"] if wallets else None,
                "verification_status": verification_by_user.get(row["id"], "not_submitted"),
                "last_login_at": last_login,
            }
        )

    return Page(items=items, page=page, page_size=page_size, total=result.count or 0)


def get_user_detail(user_id: str) -> dict[str, Any] | None:
    client = get_service_client()
    result = (
        client.table("profiles")
        .select("*, wallets(*), devices(*)")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    profile = result.data if result else None
    if not profile:
        return None

    identity_verifications = (
        client.table("identity_verification")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    recovery_status = (
        client.table("security_recovery_codes_status")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    return {
        "profile": profile,
        "identity_verifications": identity_verifications,
        "has_recovery_code": bool(recovery_status.data["has_code"]) if recovery_status and recovery_status.data else False,
        "has_login_pin": bool(profile.get("pin_hash")),
    }


def get_user_transactions(user_id: str, wallet_id: str | None, *, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    if not wallet_id:
        return Page(items=[], page=page, page_size=page_size, total=0)

    result = (
        client.table("transactions")
        .select("*", count="exact")
        .or_(f"sender_wallet_id.eq.{wallet_id},recipient_wallet_id.eq.{wallet_id}")
        .order("created_at", desc=True)
        .range(start, end)
        .execute()
    )
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def update_status(user_id: str, status: str) -> None:
    client = get_service_client()
    client.table("profiles").update({"status": status}).eq("id", user_id).execute()


def update_admin_notes(user_id: str, notes: str) -> None:
    client = get_service_client()
    client.table("profiles").update({"admin_notes": notes}).eq("id", user_id).execute()


def reset_login_pin(user_id: str, admin_id: str) -> None:
    get_service_client().rpc(
        "admin_reset_login_pin", {"p_user_id": user_id, "p_admin_id": admin_id}
    ).execute()
