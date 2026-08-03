-- JOJO Face Identity + secure device transfer (QR / Face). Two distinct
-- concepts per spec: device biometric (profiles.biometric_enabled, already
-- exists, phone-local only) vs JOJO's own custom face identity (this
-- migration - a short live recording stored server-side, used only for
-- account recovery / device transfer, never the phone's Face ID/Touch ID).

-- ===== First Face ID (permanent reference, one per user) =====
create table public.face_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  storage_path text not null,
  status text not null default 'active' check (status in ('active', 'reinitializing')),
  reinitialized_by uuid references public.administrator_accounts (id),
  reinitialized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_face_identities_updated_at
  before update on public.face_identities
  for each row execute function public.set_updated_at();

alter table public.face_identities enable row level security;
alter table public.face_identities force row level security;

create policy "face_identities_select_own"
  on public.face_identities for select
  to authenticated
  using (user_id = auth.uid());

create policy "face_identities_insert_own"
  on public.face_identities for insert
  to authenticated
  with check (user_id = auth.uid());

-- No update/delete policy: reinitialization is admin/service-role only.

-- ===== Last Face ID (temporary, per verification attempt) =====
create table public.face_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_transfer_request_id uuid,
  last_face_path text not null,
  challenge jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'approved', 'rejected', 'expired')),
  ai_result jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_face_verification_attempts_user_id on public.face_verification_attempts (user_id);

alter table public.face_verification_attempts enable row level security;
alter table public.face_verification_attempts force row level security;

create policy "face_verification_attempts_select_own"
  on public.face_verification_attempts for select
  to authenticated
  using (user_id = auth.uid());

create policy "face_verification_attempts_insert_own"
  on public.face_verification_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

-- ===== QR transfer codes (random, single-use, one account only) =====
create table public.qr_transfer_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_transfer_request_id uuid,
  code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'used', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_qr_transfer_codes_user_id on public.qr_transfer_codes (user_id);

alter table public.qr_transfer_codes enable row level security;
alter table public.qr_transfer_codes force row level security;

create policy "qr_transfer_codes_select_own"
  on public.qr_transfer_codes for select
  to authenticated
  using (user_id = auth.uid());

-- Link device_transfer_requests to whichever verification artifact resolved it.
alter table public.device_transfer_requests
  add column face_verification_attempt_id uuid references public.face_verification_attempts (id),
  add column qr_transfer_code_id uuid references public.qr_transfer_codes (id);

alter table public.face_verification_attempts
  add constraint face_verification_attempts_transfer_request_fkey
  foreign key (device_transfer_request_id) references public.device_transfer_requests (id);

alter table public.qr_transfer_codes
  add constraint qr_transfer_codes_transfer_request_fkey
  foreign key (device_transfer_request_id) references public.device_transfer_requests (id);

-- ===== Escalating lockout after failed face-verification attempts =====
alter table public.profiles
  add column face_verification_failure_count int not null default 0,
  add column face_verification_locked_until timestamptz,
  add column face_verification_disabled boolean not null default false,
  add column face_identity_prompt_skipped boolean not null default false;

-- Face verification fields are admin/service-role only, same pattern as
-- approval_status.
create or replace function public.guard_profiles_restricted_columns()
returns trigger
language plpgsql
as $$
begin
  if new.pin_hash is distinct from old.pin_hash
     and coalesce(current_setting('app.allow_restricted_profile_write', true), 'false') <> 'true' then
    raise exception 'pin_hash cannot be changed directly; use set_login_pin()';
  end if;

  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.role() <> 'service_role' then
    raise exception 'role/status cannot be changed directly by the mobile app';
  end if;

  if (new.approval_status is distinct from old.approval_status
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at
      or new.approval_rejection_reason is distinct from old.approval_rejection_reason)
     and auth.role() <> 'service_role' then
    raise exception 'approval fields can only be changed by an administrator';
  end if;

  if (new.face_verification_failure_count is distinct from old.face_verification_failure_count
      or new.face_verification_locked_until is distinct from old.face_verification_locked_until
      or new.face_verification_disabled is distinct from old.face_verification_disabled)
     and auth.role() <> 'service_role' then
    raise exception 'face verification lockout fields can only be changed by the verification process';
  end if;

  return new;
end;
$$;

-- Users may set their own skip flag directly (not security-sensitive).
