from dataclasses import dataclass
from typing import Any


@dataclass
class AccessRequest:
    id: str
    full_name: str
    email: str
    reason: str | None
    status: str
    requested_at: str

    @staticmethod
    def from_row(row: dict[str, Any]) -> "AccessRequest":
        return AccessRequest(
            id=row["id"],
            full_name=row["full_name"],
            email=row["email"],
            reason=row.get("reason"),
            status=row["status"],
            requested_at=row["requested_at"],
        )
