import os

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name}. Copy .env.example to .env and fill in the values."
        )
    return value


class Config:
    SUPABASE_URL = _require("SUPABASE_URL")
    SUPABASE_ANON_KEY = _require("SUPABASE_ANON_KEY")
    # Server-only. Must never be sent to the browser or logged.
    SUPABASE_SERVICE_ROLE_KEY = _require("SUPABASE_SERVICE_ROLE_KEY")

    SECRET_KEY = _require("SECRET_KEY")

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    # Overridden at runtime from the session_timeout system setting; this is
    # just the default until settings are loaded from the database.
    PERMANENT_SESSION_LIFETIME = 60 * 30
