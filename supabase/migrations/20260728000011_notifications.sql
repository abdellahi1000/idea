create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  read_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications (user_id);

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_mark_read_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Only read_at is client-writable (marking a notification read); this
-- trigger blocks changes to any other column, since RLS itself is row- not
-- column-level.
create or replace function public.guard_notification_content_columns()
returns trigger
language plpgsql
as $$
begin
  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.type is distinct from old.type
     or new.metadata is distinct from old.metadata
     or new.user_id is distinct from old.user_id then
    raise exception 'Only read_at may be updated on notifications';
  end if;
  return new;
end;
$$;

create trigger guard_notifications_content
  before update on public.notifications
  for each row execute function public.guard_notification_content_columns();

-- No insert/delete policies: notifications are created only by SECURITY
-- DEFINER functions (e.g. inside create_transaction()), never directly by
-- the client, even for their own user_id.

alter publication supabase_realtime add table public.notifications;
