from dataclasses import dataclass
from typing import Any


@dataclass
class Profile:
    id: str
    full_name: str
    phone: str | None
    email: str | None
    date_of_birth: str | None
    profile_picture_path: str | None
    role: str
    status: str
    biometric_enabled: bool
    admin_notes: str | None
    created_at: str
    updated_at: str

    @staticmethod
    def from_row(row: dict[str, Any]) -> "Profile":
        return Profile(
            id=row["id"],
            full_name=row["full_name"],
            phone=row.get("phone"),
            email=row.get("email"),
            date_of_birth=row.get("date_of_birth"),
            profile_picture_path=row.get("profile_picture_path"),
            role=row["role"],
            status=row["status"],
            biometric_enabled=row.get("biometric_enabled", False),
            admin_notes=row.get("admin_notes"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
