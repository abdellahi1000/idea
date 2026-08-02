"""One-off script: applies every supabase/migrations/*.sql file, in order,
against the live project via the session pooler. Each file runs in its own
transaction; stops immediately on the first failure so it's obvious which
migration needs attention. Not part of the Flask app - a deployment utility.

Reads connection details from admin/.env (SUPABASE_DB_*) - never hardcode
the database password in this file.
"""

import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ADMIN_DIR = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ADMIN_DIR.parent / "supabase" / "migrations"

load_dotenv(ADMIN_DIR / ".env")


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing {name} in admin/.env - see .env.example.")
    return value


CONN_PARAMS = {
    "host": _require("SUPABASE_DB_HOST"),
    "port": int(os.environ.get("SUPABASE_DB_PORT", "5432")),
    "dbname": os.environ.get("SUPABASE_DB_NAME", "postgres"),
    "user": _require("SUPABASE_DB_USER"),
    "password": _require("SUPABASE_DB_PASSWORD"),
    "connect_timeout": 15,
}


def main() -> int:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        print("No migration files found.")
        return 1

    conn = psycopg2.connect(**CONN_PARAMS)
    conn.autocommit = False

    for path in files:
        sql = path.read_text(encoding="utf-8")
        print(f"Applying {path.name} ...", end=" ", flush=True)
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            print("OK")
        except Exception as exc:  # noqa: BLE001
            conn.rollback()
            print("FAILED")
            print(f"  -> {exc}")
            conn.close()
            return 1

    conn.close()
    print(f"\nAll {len(files)} migrations applied successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
