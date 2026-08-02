-- profiles.email was meant to default from the signup email (Phase 2
-- decision), but handle_new_user() never actually copied it over, leaving
-- every new profile's email blank in the admin dashboard.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    new.email
  );

  insert into public.wallets (user_id, currency_code)
  values (new.id, 'MRU');

  return new;
end;
$$;

-- Backfill existing profiles that were created before this fix.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
