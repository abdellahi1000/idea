alter table public.profiles
  add column email text,
  add column biometric_enabled boolean not null default false;
