import uuid

from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def _looks_like_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _enrich_with_names(client, rows: list[dict]) -> list[dict]:
    wallet_ids = {row[key] for row in rows for key in ("sender_wallet_id", "recipient_wallet_id") if row.get(key)}
    if not wallet_ids:
        return rows

    wallets = client.table("wallets").select("id, user_id").in_("id", list(wallet_ids)).execute().data or []
    user_id_by_wallet = {w["id"]: w["user_id"] for w in wallets}

    user_ids = list(set(user_id_by_wallet.values()))
    profiles = (
        client.table("profiles").select("id, full_name").in_("id", user_ids).execute().data or []
        if user_ids
        else []
    )
    name_by_user = {p["id"]: p["full_name"] for p in profiles}

    def name_for(wallet_id: str | None) -> str | None:
        if not wallet_id:
            return None
        user_id = user_id_by_wallet.get(wallet_id)
        return name_by_user.get(user_id) if user_id else None

    for row in rows:
        row["sender_name"] = name_for(row.get("sender_wallet_id"))
        row["receiver_name"] = name_for(row.get("recipient_wallet_id"))
    return rows


def _wallet_ids_matching_search(client, search: str) -> list[str]:
    """Resolves a name/phone search term to the set of wallet ids belonging
    to matching users, so it can be applied as a proper server-side filter
    before pagination (rather than filtering already-paginated rows, which
    would silently drop matches on other pages)."""
    profiles = (
        client.table("profiles")
        .select("id")
        .or_(f"full_name.ilike.%{search}%,phone.ilike.%{search}%")
        .execute()
        .data
        or []
    )
    if not profiles:
        return []
    user_ids = [p["id"] for p in profiles]
    wallets = client.table("wallets").select("id").in_("user_id", user_ids).execute().data or []
    return [w["id"] for w in wallets]


def _apply_filters(query, client, *, search, status, date_from, date_to, transaction_id):
    if status:
        query = query.eq("status", status)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)
    if transaction_id:
        query = query.eq("id", transaction_id)
    if search:
        if _looks_like_uuid(search):
            query = query.eq("id", search)
        else:
            wallet_ids = _wallet_ids_matching_search(client, search)
            if not wallet_ids:
                # No matching user - force an empty result set rather than
                # returning everything.
                query = query.eq("id", "00000000-0000-0000-0000-000000000000")
            else:
                ids_csv = ",".join(wallet_ids)
                query = query.or_(f"sender_wallet_id.in.({ids_csv}),recipient_wallet_id.in.({ids_csv})")
    return query


def list_transactions(
    *,
    search: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    transaction_id: str | None = None,
    sort: str = "created_at",
    descending: bool = True,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    query = client.table("transactions").select("*", count="exact")
    query = _apply_filters(
        query, client, search=search, status=status, date_from=date_from, date_to=date_to, transaction_id=transaction_id
    )

    result = query.order(sort, desc=descending).range(start, end).execute()
    rows = _enrich_with_names(client, result.data or [])

    return Page(items=rows, page=page, page_size=page_size, total=result.count or 0)


def list_all_for_export(
    *,
    search: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    transaction_id: str | None = None,
) -> list[dict]:
    """Same filters as list_transactions but returns every matching row,
    unpaginated, for CSV export."""
    client = get_service_client()
    query = client.table("transactions").select("*")
    query = _apply_filters(
        query, client, search=search, status=status, date_from=date_from, date_to=date_to, transaction_id=transaction_id
    )
    result = query.order("created_at", desc=True).execute()
    return _enrich_with_names(client, result.data or [])
