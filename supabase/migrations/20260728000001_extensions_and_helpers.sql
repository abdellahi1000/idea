-- Extensions and shared helper functions/triggers used by every table below.

create extension if not exists pgcrypto with schema extensions;

-- Shared updated_at trigger, applied per-table in each table's migration.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
