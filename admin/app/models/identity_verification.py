from dataclasses import dataclass
from typing import Any


@dataclass
class IdentityVerification:
    id: str
    user_id: str
    document_type: str
    document_number: str
    document_front_path: str | None
    document_back_path: str | None
    selfie_path: str | None
    status: str
    rejection_reason: str | None
    match_similarity: float | None
    created_at: str
    user_full_name: str | None = None

    @staticmethod
    def from_row(row: dict[str, Any]) -> "IdentityVerification":
        return IdentityVerification(
            id=row["id"],
            user_id=row["user_id"],
            document_type=row["document_type"],
            document_number=row["document_number"],
            document_front_path=row.get("document_front_path"),
            document_back_path=row.get("document_back_path"),
            selfie_path=row.get("selfie_path"),
            status=row["status"],
            rejection_reason=row.get("rejection_reason"),
            match_similarity=row.get("match_similarity"),
            created_at=row["created_at"],
            user_full_name=(row.get("profiles") or {}).get("full_name") if row.get("profiles") else None,
        )
