from dataclasses import dataclass

from flask_login import LoginManager, UserMixin

from app.authentication.supabase_clients import get_service_client

login_manager = LoginManager()
login_manager.login_view = "auth.login"
login_manager.login_message = None


@dataclass
class AdminUser(UserMixin):
    id: str
    email: str
    full_name: str
    role: str

    def get_id(self) -> str:
        return self.id

    @property
    def is_super_administrator(self) -> bool:
        return self.role == "super_administrator"


def load_active_admin(admin_id: str) -> AdminUser | None:
    client = get_service_client()
    result = (
        client.table("administrator_accounts")
        .select("id, email, full_name, role, status")
        .eq("id", admin_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    row = result.data if result else None
    if not row:
        return None
    return AdminUser(id=row["id"], email=row["email"], full_name=row["full_name"], role=row["role"])


@login_manager.user_loader
def load_user(admin_id: str) -> AdminUser | None:
    # Re-checked on every request (not cached in the session) so a status
    # change (e.g. another super_administrator disabling this account) takes
    # effect immediately instead of at next login.
    return load_active_admin(admin_id)
