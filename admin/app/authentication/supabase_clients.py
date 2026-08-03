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

import httpx
from flask import current_app
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

_service_client: Client | None = None
_auth_check_client: Client | None = None


def _build_httpx_client() -> httpx.Client:
    # These clients are module-level singletons that live for the whole
    # process, so their pooled keep-alive connections can sit idle for a
    # long time between admin requests. Some networks/proxies silently
    # drop idle sockets, which then surfaces as
    # httpx.ConnectError: [WinError 10054] An existing connection was
    # forcibly closed by the remote host on the next request. A short
    # keepalive_expiry plus one automatic retry on connection errors
    # absorbs that instead of failing the admin page.
    return httpx.Client(
        transport=httpx.HTTPTransport(retries=1),
        limits=httpx.Limits(max_keepalive_connections=10, keepalive_expiry=30),
    )


def get_service_client() -> Client:
    global _service_client
    if _service_client is None:
        _service_client = create_client(
            current_app.config["SUPABASE_URL"],
            current_app.config["SUPABASE_SERVICE_ROLE_KEY"],
            options=SyncClientOptions(httpx_client=_build_httpx_client()),
        )
    return _service_client


def get_auth_check_client() -> Client:
    global _auth_check_client
    if _auth_check_client is None:
        _auth_check_client = create_client(
            current_app.config["SUPABASE_URL"],
            current_app.config["SUPABASE_ANON_KEY"],
            options=SyncClientOptions(httpx_client=_build_httpx_client()),
        )
    return _auth_check_client
