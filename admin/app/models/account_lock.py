from dataclasses import dataclass
from typing import Any


@dataclass
class AccountLock:
    id: str
    user_id: str
    reason: str
    locked_at: str
    unlocked_at: str | None
    user_full_name: str | None = None

    @staticmethod
    def from_row(row: dict[str, Any]) -> "AccountLock":
        return AccountLock(
            id=row["id"],
            user_id=row["user_id"],
            reason=row["reason"],
            locked_at=row["locked_at"],
            unlocked_at=row.get("unlocked_at"),
        )
