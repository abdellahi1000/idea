"""Maps system_settings keys to how the Settings page should render and
validate them, so the template stays generic instead of one-off per key."""

from dataclasses import dataclass
from typing import Literal

SettingType = Literal["number", "boolean", "text"]


@dataclass
class SettingField:
    key: str
    label: str
    type: SettingType
    default: object
    help_text: str = ""


SETTINGS_SCHEMA: list[SettingField] = [
    SettingField("new_device_activation_delay_minutes", "New Device Activation Delay (minutes)", "number", 0),
    SettingField("max_recovery_code_attempts", "Maximum Security Recovery Code Attempts", "number", 5),
    SettingField("face_id_available", "Face ID Availability", "boolean", True),
    SettingField("fingerprint_available", "Fingerprint Availability", "boolean", True),
    SettingField("qr_code_available", "QR Code Availability", "boolean", True),
    SettingField("sms_notifications_enabled", "SMS Configuration (enabled)", "boolean", False),
    SettingField("push_notifications_enabled", "Notification Settings (push enabled)", "boolean", True),
    SettingField("session_timeout_minutes", "Session Timeout (minutes)", "number", 30),
    SettingField("min_transfer_amount", "Minimum Transfer Amount", "number", 1.0),
    SettingField("max_transfer_amount", "Maximum Transfer Amount", "number", 10000.0),
]
