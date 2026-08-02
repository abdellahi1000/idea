"""
Two server-side Supabase clients, both instantiated once per process:

- ``service_client``: used for every data read/write in the dashboard. Built
  with the service role key, so it bypasses RLS entirely - this is what
  makes cross-user admin queries possible at all. Never expose this key or
  this client to a template/response.
- ``auth_check_client``: used ONLY to verify an admin's email/password via
  Supabase Auth during login. Built with the anon key, exactly like the
  mobile app would use, but the call happens server-to-server from Flask,
  never from a browser.
"""

from flask import current_app
from supabase import Client, create_client

_service_client: Client | None = None
_auth_check_client: Client | None = None


def get_service_client() -> Client:
    global _service_client
    if _service_client is None:
        _service_client = create_client(
            current_app.config["SUPABASE_URL"],
            current_app.config["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _service_client


def get_auth_check_client() -> Client:
    global _auth_check_client
    if _auth_check_client is None:
        _auth_check_client = create_client(
            current_app.config["SUPABASE_URL"],
            current_app.config["SUPABASE_ANON_KEY"],
        )
    return _auth_check_client
