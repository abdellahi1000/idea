from dataclasses import dataclass
from typing import Any


@dataclass
class Device:
    id: str
    user_id: str
    device_name: str
    platform: str
    status: str
    last_login_at: str | None

    @staticmethod
    def from_row(row: dict[str, Any]) -> "Device":
        return Device(
            id=row["id"],
            user_id=row["user_id"],
            device_name=row["device_name"],
            platform=row["platform"],
            status=row["status"],
            last_login_at=row.get("last_login_at"),
        )


@dataclass
class DeviceTransferRequest:
    id: str
    user_id: str
    from_device_id: str | None
    to_device_id: str | None
    verification_method: str | None
    status: str
    requested_at: str
    user_full_name: str | None = None
    from_device_name: str | None = None
    to_device_name: str | None = None

    @staticmethod
    def from_row(row: dict[str, Any]) -> "DeviceTransferRequest":
        return DeviceTransferRequest(
            id=row["id"],
            user_id=row["user_id"],
            from_device_id=row.get("from_device_id"),
            to_device_id=row.get("to_device_id"),
            verification_method=row.get("verification_method"),
            status=row["status"],
            requested_at=row["requested_at"],
        )
