create table public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger set_system_settings_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;
alter table public.system_settings force row level security;

-- Deny-all by default. A narrow, explicit allowlist of keys the mobile app
-- is allowed to read at runtime (e.g. min/max transfer amount) can be added
-- later as its own policy once those keys and their exact use are decided -
-- see plan section 2 (system_settings) open item.

insert into public.system_settings (key, value, description) values
  ('min_transfer_amount', '"1.00"', 'Minimum amount (in currency units) allowed per transfer'),
  ('max_transfer_amount', '"10000.00"', 'Maximum amount (in currency units) allowed per transfer');
