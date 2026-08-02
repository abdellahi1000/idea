from app.authentication.supabase_clients import get_service_client


def get_all() -> dict[str, dict]:
    client = get_service_client()
    result = client.table("system_settings").select("*").execute()
    return {row["key"]: row for row in (result.data or [])}


def get_value(key: str, default=None):
    client = get_service_client()
    result = client.table("system_settings").select("value").eq("key", key).maybe_single().execute()
    if not result or not result.data:
        return default
    return result.data["value"]


def upsert(key: str, value, description: str | None = None) -> None:
    client = get_service_client()
    payload = {"key": key, "value": value}
    if description is not None:
        payload["description"] = description
    client.table("system_settings").upsert(payload).execute()
