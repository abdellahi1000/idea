create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id),
  actor_admin_id uuid references public.administrator_accounts (id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on public.audit_logs (entity_table, entity_id);
create index idx_audit_logs_actor_user_id on public.audit_logs (actor_user_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at);

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

-- Immutable and internal-only: no policies for anon/authenticated at all
-- (no select, no insert, no update, no delete). Rows are written only by
-- SECURITY DEFINER functions such as create_transaction(), which run as the
-- table owner and bypass RLS.
