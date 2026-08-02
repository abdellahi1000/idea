import click
from flask import Flask

from app.authentication.supabase_clients import get_service_client


def register(app: Flask) -> None:
    @app.cli.command("create-admin")
    @click.option("--email", prompt=True)
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    @click.option("--full-name", prompt="Full name")
    @click.option(
        "--role",
        type=click.Choice(["administrator", "super_administrator"]),
        default="administrator",
    )
    def create_admin(email: str, password: str, full_name: str, role: str):
        """Creates a Supabase Auth user (if needed) and an active
        administrator_accounts row for them. Run once per admin, e.g.:

            flask create-admin --email you@example.com --role super_administrator
        """
        client = get_service_client()

        existing = None
        try:
            page = client.auth.admin.list_users()
            existing = next((u for u in page if u.email == email), None)
        except Exception:  # noqa: BLE001 - fall through to create
            existing = None

        if existing:
            user_id = existing.id
            click.echo(f"Using existing Supabase Auth user {email} ({user_id}).")
        else:
            created = client.auth.admin.create_user(
                {"email": email, "password": password, "email_confirm": True}
            )
            user_id = created.user.id
            click.echo(f"Created Supabase Auth user {email} ({user_id}).")

        client.table("administrator_accounts").upsert(
            {"id": user_id, "email": email, "full_name": full_name, "role": role, "status": "active"}
        ).execute()

        click.echo(f"administrator_accounts row ready for {email} with role {role}.")
