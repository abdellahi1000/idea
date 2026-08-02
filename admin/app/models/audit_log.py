from dataclasses import dataclass
from typing import Any


@dataclass
class AuditLog:
    id: str
    actor_admin_id: str | None
    actor_user_id: str | None
    action: str
    entity_table: str
    entity_id: str | None
    metadata: dict
    ip_address: str | None
    result: str
    created_at: str
    admin_name: str | None = None

    @staticmethod
    def from_row(row: dict[str, Any]) -> "AuditLog":
        return AuditLog(
            id=row["id"],
            actor_admin_id=row.get("actor_admin_id"),
            actor_user_id=row.get("actor_user_id"),
            action=row["action"],
            entity_table=row["entity_table"],
            entity_id=row.get("entity_id"),
            metadata=row.get("metadata") or {},
            ip_address=row.get("ip_address"),
            result=row.get("result", "success"),
            created_at=row["created_at"],
        )
