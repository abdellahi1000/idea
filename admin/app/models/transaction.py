from dataclasses import dataclass
from typing import Any


@dataclass
class Transaction:
    id: str
    sender_wallet_id: str | None
    recipient_wallet_id: str | None
    amount: float
    currency_code: str
    type: str
    status: str
    reference_note: str | None
    created_at: str
    sender_name: str | None = None
    receiver_name: str | None = None

    @staticmethod
    def from_row(row: dict[str, Any]) -> "Transaction":
        return Transaction(
            id=row["id"],
            sender_wallet_id=row.get("sender_wallet_id"),
            recipient_wallet_id=row.get("recipient_wallet_id"),
            amount=float(row["amount"]),
            currency_code=row["currency_code"],
            type=row["type"],
            status=row["status"],
            reference_note=row.get("reference_note"),
            created_at=row["created_at"],
            sender_name=row.get("sender_name"),
            receiver_name=row.get("receiver_name"),
        )
