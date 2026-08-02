from datetime import UTC, datetime

from app.authentication.supabase_clients import get_service_client


def _count(client, table: str, **filters) -> int:
    query = client.table(table).select("id", count="exact")
    for column, value in filters.items():
        query = query.eq(column, value)
    result = query.limit(1).execute()
    return result.count or 0


def get_stats() -> dict:
    client = get_service_client()
    today = datetime.now(UTC).date().isoformat()

    total_users = _count(client, "profiles")
    active_accounts = _count(client, "profiles", status="active")
    suspended_accounts = _count(client, "profiles", status="suspended")
    locked_accounts = _count(client, "profiles", status="locked")

    transfers_today_result = (
        client.table("transactions")
        .select("amount", count="exact")
        .gte("created_at", today)
        .execute()
    )
    transfers_today = transfers_today_result.count or 0
    total_transferred_today = sum(row["amount"] for row in (transfers_today_result.data or []))

    pending_identity = _count(client, "identity_verification", status="pending")
    pending_device_transfers = _count(client, "device_transfer_requests", status="pending")

    return {
        "total_users": total_users,
        "active_accounts": active_accounts,
        "suspended_accounts": suspended_accounts,
        "locked_accounts": locked_accounts,
        "transfers_today": transfers_today,
        "total_transferred_today": total_transferred_today,
        "pending_identity_verifications": pending_identity,
        "pending_device_transfers": pending_device_transfers,
    }
