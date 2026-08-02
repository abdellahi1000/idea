from dataclasses import dataclass
from typing import Any


@dataclass
class Wallet:
    id: str
    user_id: str
    balance: float
    currency_code: str
    status: str
    updated_at: str

    @staticmethod
    def from_row(row: dict[str, Any]) -> "Wallet":
        return Wallet(
            id=row["id"],
            user_id=row["user_id"],
            balance=float(row["balance"]),
            currency_code=row["currency_code"],
            status=row["status"],
            updated_at=row["updated_at"],
        )
