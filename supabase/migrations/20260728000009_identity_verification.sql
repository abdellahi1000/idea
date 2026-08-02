create table public.identity_verification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('national_id', 'passport', 'drivers_license')),
  document_number text not null,
  document_front_path text,
  document_back_path text,
  selfie_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.administrator_accounts (id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_identity_verification_user_id on public.identity_verification (user_id);

create trigger set_identity_verification_updated_at
  before update on public.identity_verification
  for each row execute function public.set_updated_at();

-- RLS is row-level only, so a client update to their own row could otherwise
-- rewrite status/reviewed_by/rejection_reason. This trigger blocks that;
-- those columns may only change via a future admin-side RPC (Flask phase),
-- which will run as the table owner and bypass RLS.
create or replace function public.guard_identity_verification_review_columns()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     or new.reviewed_by is distinct from old.reviewed_by
     or new.rejection_reason is distinct from old.rejection_reason then
    if coalesce(current_setting('app.allow_identity_review', true), 'false') <> 'true' then
      raise exception 'identity_verification review fields can only be changed by an administrator review process';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_identity_verification_review
  before update on public.identity_verification
  for each row execute function public.guard_identity_verification_review_columns();

alter table public.identity_verification enable row level security;
alter table public.identity_verification force row level security;

create policy "identity_verification_select_own"
  on public.identity_verification for select
  to authenticated
  using (user_id = auth.uid());

create policy "identity_verification_insert_own"
  on public.identity_verification for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "identity_verification_update_own"
  on public.identity_verification for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
