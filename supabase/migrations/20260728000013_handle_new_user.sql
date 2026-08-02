-- Runs after every auth.users insert (i.e. every sign-up) and atomically
-- creates the profile row and a default USD wallet. SECURITY DEFINER so it
-- can write to profiles/wallets despite RLS denying direct client inserts
-- on those tables.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );

  insert into public.wallets (user_id, currency_code)
  values (new.id, 'USD');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
