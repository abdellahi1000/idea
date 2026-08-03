-- Internal Account Serial Number ("JOJO-000001") shown in the admin Team
-- page's customer selector list, so admins can identify an account without
-- exposing anything more sensitive than name/phone.

create sequence if not exists public.account_number_seq;

alter table public.profiles
  add column account_number text unique;

-- Backfill existing rows in signup order, one at a time, so numbers stay
-- sequential and gap-free for pre-existing accounts.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where account_number is null order by created_at loop
    update public.profiles
    set account_number = 'JOJO-' || lpad(nextval('public.account_number_seq')::text, 6, '0')
    where id = r.id;
  end loop;
end $$;

alter table public.profiles
  alter column account_number set default ('JOJO-' || lpad(nextval('public.account_number_seq')::text, 6, '0')),
  alter column account_number set not null;
