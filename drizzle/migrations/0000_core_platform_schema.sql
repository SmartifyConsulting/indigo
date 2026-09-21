-- ============ roles ============
create type public.app_role as enum ('admin', 'advisor', 'compliance', 'client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  title text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "roles readable by authenticated" on public.user_roles for select to authenticated using (true);
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- new signups get a profile; the first account becomes the admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;

  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'advisor') on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ firm + workspace records ============
create table public.fsp_settings (
  id boolean primary key default true check (id),
  name text not null default '',
  fsp_number text not null default '',
  key_individual text not null default '',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.fsp_settings to authenticated;
grant all on public.fsp_settings to service_role;
alter table public.fsp_settings enable row level security;
create policy "fsp readable" on public.fsp_settings for select to authenticated using (true);
create policy "fsp writable" on public.fsp_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.advisors (
  id text primary key,
  name text not null,
  title text not null default '',
  fs_number text not null default '',
  active boolean not null default true,
  onboarded_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null
);
grant select, insert, update, delete on public.advisors to authenticated;
grant all on public.advisors to service_role;
alter table public.advisors enable row level security;
create policy "advisors readable" on public.advisors for select to authenticated using (true);
create policy "advisors writable" on public.advisors for all to authenticated using (true) with check (true);

create table public.cases (
  id text primary key,
  code text not null unique,
  advisor_id text not null,
  client_name text not null,
  email text not null default '',
  phone text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cases_advisor_idx on public.cases (advisor_id);
grant select, insert, update, delete on public.cases to authenticated;
grant all on public.cases to service_role;
alter table public.cases enable row level security;
create policy "cases readable" on public.cases for select to authenticated using (true);
create policy "cases writable" on public.cases for all to authenticated using (true) with check (true);

create table public.ledger_events (
  seq integer primary key,
  ts timestamptz not null,
  case_id text,
  actor_role text not null,
  actor_name text not null,
  type text not null,
  summary text not null,
  prev_hash text not null,
  hash text not null unique
);
grant select, insert on public.ledger_events to authenticated;
grant all on public.ledger_events to service_role;
alter table public.ledger_events enable row level security;
create policy "ledger readable" on public.ledger_events for select to authenticated using (true);
create policy "ledger append only" on public.ledger_events for insert to authenticated with check (true);

create table public.crm_connections (
  id text primary key,
  name text not null,
  detail text not null default '',
  connected boolean not null default false,
  last_sync_at timestamptz
);
grant select, insert, update on public.crm_connections to authenticated;
grant all on public.crm_connections to service_role;
alter table public.crm_connections enable row level security;
create policy "crm readable" on public.crm_connections for select to authenticated using (true);
create policy "crm writable" on public.crm_connections for all to authenticated using (true) with check (true);

create table public.crm_log (
  id text primary key,
  ts timestamptz not null,
  crm text not null,
  case_id text not null,
  client_name text not null,
  object text not null,
  action text not null
);
grant select, insert on public.crm_log to authenticated;
grant all on public.crm_log to service_role;
alter table public.crm_log enable row level security;
create policy "crm log readable" on public.crm_log for select to authenticated using (true);
create policy "crm log insert" on public.crm_log for insert to authenticated with check (true);

create table public.integration_queue (
  id text primary key,
  ts timestamptz not null,
  target text not null,
  case_id text not null default '',
  client_name text not null default '',
  action text not null,
  status text not null,
  attempts integer not null default 1,
  last_error text
);
grant select, insert, update on public.integration_queue to authenticated;
grant all on public.integration_queue to service_role;
alter table public.integration_queue enable row level security;
create policy "queue readable" on public.integration_queue for select to authenticated using (true);
create policy "queue writable" on public.integration_queue for all to authenticated using (true) with check (true);

-- ============ admin: integrations + API credentials ============
create table public.api_integrations (
  id text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  base_url text not null default '',
  environment text not null default 'sandbox',
  status text not null default 'not-configured',
  key_hint text,
  last_rotated_at timestamptz,
  last_checked_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
grant select on public.api_integrations to authenticated;
grant all on public.api_integrations to service_role;
alter table public.api_integrations enable row level security;
create policy "integrations readable" on public.api_integrations for select to authenticated using (true);
create policy "admins manage integrations" on public.api_integrations for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- secret material: never granted to authenticated; only privileged server code reads it
create table public.api_credentials (
  integration_id text primary key references public.api_integrations(id) on delete cascade,
  secret_value text not null,
  rotated_at timestamptz not null default now(),
  rotated_by uuid references auth.users(id) on delete set null
);
grant all on public.api_credentials to service_role;
alter table public.api_credentials enable row level security;

create table public.api_call_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  integration_id text not null,
  endpoint text not null default '',
  outcome text not null,
  latency_ms integer not null default 0,
  detail text not null default ''
);
create index api_call_log_ts_idx on public.api_call_log (ts desc);
grant select, insert on public.api_call_log to authenticated;
grant all on public.api_call_log to service_role;
alter table public.api_call_log enable row level security;
create policy "call log readable" on public.api_call_log for select to authenticated using (true);
create policy "call log insert" on public.api_call_log for insert to authenticated with check (true);

insert into public.api_integrations (id, name, category, description, base_url) values
  ('astute', 'Astute Financial Services Exchange', 'data', 'Life, disability and investment portfolio retrieval with cross-alerting.', 'https://api.astutefse.co.za'),
  ('didit', 'DIDIT identity verification', 'identity', 'Liveness, Home Affairs ID match and AML/PEP screening.', 'https://api.didit.me'),
  ('momentum', 'Momentum', 'insurer', 'Life, income protection and severe illness quoting.', ''),
  ('discovery', 'Discovery', 'insurer', 'Life, income protection and severe illness quoting.', ''),
  ('old-mutual', 'Old Mutual', 'insurer', 'Life, income protection and severe illness quoting.', ''),
  ('sanlam', 'Sanlam', 'insurer', 'Life, income protection and severe illness quoting.', ''),
  ('santam', 'Santam', 'insurer', 'Vehicle, home, contents and pet quoting.', ''),
  ('auto-general', 'Auto & General', 'insurer', 'Vehicle, home, contents and pet quoting.', ''),
  ('salesforce', 'Salesforce', 'crm', 'Two-way client and policy record sync.', 'https://login.salesforce.com'),
  ('hubspot', 'HubSpot', 'crm', 'Two-way client and policy record sync.', 'https://api.hubapi.com');
