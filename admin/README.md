# JOJO Admin Dashboard

Flask + Jinja2 server-rendered admin dashboard for JOJO staff. Not customer-facing. See `Admin_web.docx` at the repo root for the full specification this implements.

## Setup

```bash
cd admin
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # fill in SUPABASE_URL / keys / SECRET_KEY
```

The migrations under `../supabase/migrations/` must be applied to your Supabase project before anything here will work against real data. They're already applied against the current project (`tkybaipizpahsqeqdeog`). To (re-)apply them against a different project:

```bash
copy .env.example .env    # fill in SUPABASE_DB_* from Dashboard -> Connect -> Session pooler
python scripts\apply_migrations.py
```

Each migration file runs in its own transaction, in order, and the script stops at the first failure so it's obvious which file needs attention. The `SUPABASE_DB_*` values are only used by this script - the Flask app itself never reads them.

## Run

```bash
flask --app wsgi run
```

By default, unhandled errors show the generic `errors/500.html` page - no stack traces, matching the "never expose internal errors" rule. Only add `--debug` (or `FLASK_DEBUG=1`) if you specifically need Werkzeug's interactive debugger for local troubleshooting; it shows full tracebacks and an interactive eval console, so never use it anywhere other than your own machine.

## Create the first administrator

Simplest: visit `/request-access` (linked as "Create Account" from the login page) and sign up directly - every self-signup gets `super_administrator` access immediately, no approval step.

Alternatively, the CLI works too:

```bash
flask --app wsgi create-admin --email you@example.com --role super_administrator
```

This creates a Supabase Auth user (or reuses an existing one with that email) and an active `administrator_accounts` row. Run it again with `--role administrator` for day-to-day staff accounts.

## Notes

- All data access goes through the Supabase **service role key** (server-only, set in `.env`, never sent to the browser). The anon key is used only to verify an admin's password during login.
- `administrator.role` is `administrator` (day-to-day operations) or `super_administrator` (adds Balance Management, Security Recovery Code reinitialization approval, and Settings).
- Every mutating action writes an immutable row to `audit_logs` via `app/middleware/audit.py`.
