from app.middleware.audit import log_admin_action
from app.repositories import settings_repository as repo
from app.utilities.settings_schema import SETTINGS_SCHEMA


def get_settings_for_display() -> list[dict]:
    stored = repo.get_all()
    fields = []
    for field in SETTINGS_SCHEMA:
        row = stored.get(field.key)
        value = row["value"] if row else field.default
        fields.append(
            {
                "key": field.key,
                "label": field.label,
                "type": field.type,
                "value": value,
                "help_text": field.help_text,
            }
        )
    return fields


def update_setting(key: str, value, admin_id: str) -> None:
    repo.upsert(key, value)
    log_admin_action(
        admin_id=admin_id,
        action="system_settings.updated",
        entity_table="system_settings",
        # entity_id is a uuid column; system_settings is keyed by text, not
        # uuid, so the key goes in metadata instead of entity_id.
        metadata={"key": key, "value": value},
    )


def get_session_timeout_seconds() -> int:
    minutes = repo.get_value("session_timeout_minutes", default=30)
    try:
        return int(minutes) * 60
    except (TypeError, ValueError):
        return 30 * 60
