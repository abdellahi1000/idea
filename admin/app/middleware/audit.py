from typing import Any

from flask import request

from app.authentication.supabase_clients import get_service_client


def log_admin_action(
    *,
    admin_id: str,
    action: str,
    entity_table: str,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    result: str = "success",
) -> None:
    """Writes one immutable audit_logs row. Called explicitly at the end of
    every mutating service-layer operation - never silently skipped."""

    client = get_service_client()
    client.table("audit_logs").insert(
        {
            "actor_admin_id": admin_id,
            "action": action,
            "entity_table": entity_table,
            "entity_id": entity_id,
            "metadata": metadata or {},
            "ip_address": request.remote_addr,
            "result": result,
        }
    ).execute()
