from app.authentication.supabase_clients import get_service_client


def get_wallet(wallet_id: str) -> dict | None:
    client = get_service_client()
    result = client.table("wallets").select("*").eq("id", wallet_id).maybe_single().execute()
    return result.data if result else None


def adjust_balance(wallet_id: str, amount_delta: float, reason: str, admin_id: str) -> dict:
    client = get_service_client()
    result = client.rpc(
        "admin_adjust_balance",
        {
            "p_wallet_id": wallet_id,
            "p_amount_delta": amount_delta,
            "p_reason": reason,
            "p_admin_id": admin_id,
        },
    ).execute()
    return result.data
