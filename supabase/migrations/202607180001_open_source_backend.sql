begin;

create extension if not exists pgcrypto;

create table public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  consent_version text not null check (char_length(consent_version) between 1 and 32),
  cloud_save boolean not null default false,
  product_analytics boolean not null default false,
  recorded_at timestamptz not null default now()
);

create table public.chart_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  chart_hash text not null check (chart_hash ~ '^sha256:[a-f0-9]{64}$'),
  schema_version text not null check (char_length(schema_version) between 1 and 32),
  engine_version text not null check (char_length(engine_version) between 1 and 64),
  name text not null check (char_length(name) between 1 and 80),
  birth_date date not null,
  birth_time time not null,
  location_label text not null check (char_length(location_label) <= 160),
  timezone text not null check (char_length(timezone) between 1 and 64),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, chart_hash)
);

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  event_name text not null check (event_name in (
    'app_open', 'form_started', 'chart_generate_started', 'chart_generate_succeeded',
    'chart_generate_failed', 'detail_opened', 'poster_saved', 'share_started',
    'share_completed', 'share_cancelled', 'language_changed', 'privacy_mode_changed'
  )),
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  created_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null check (char_length(target_type) between 1 and 64),
  target_id text check (char_length(target_id) <= 128),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create or replace function public.is_pluto_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.product_event_properties_are_safe(properties jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(properties) = 'object'
    and octet_length(properties::text) <= 2048
    and not exists (
      select 1 from jsonb_each(properties) as item
      where jsonb_typeof(item.value) in ('object', 'array')
    )
    and not (properties ?| array[
      'name', 'birthDate', 'birthTime', 'location', 'locationLabel', 'query',
      'latitude', 'longitude', 'chart', 'snapshot', 'text', 'contacts',
      'clipboard', 'userAgent', 'stack'
    ]);
$$;

alter table public.product_events
  add constraint product_events_safe_properties
  check (public.product_event_properties_are_safe(properties));

alter table public.app_users enable row level security;
alter table public.consent_records enable row level security;
alter table public.chart_records enable row level security;
alter table public.product_events enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "users read own profile" on public.app_users for select using (id = auth.uid());
create policy "users create own profile" on public.app_users for insert with check (id = auth.uid());
create policy "users update own profile" on public.app_users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins read user profiles" on public.app_users for select using (public.is_pluto_admin());

create policy "users read own consent" on public.consent_records for select using (user_id = auth.uid());
create policy "users create own consent" on public.consent_records for insert with check (user_id = auth.uid());
create policy "admins read consent" on public.consent_records for select using (public.is_pluto_admin());

create policy "users read own charts" on public.chart_records for select using (user_id = auth.uid());
create policy "users create own charts" on public.chart_records for insert with check (user_id = auth.uid());
create policy "users update own charts" on public.chart_records for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own charts" on public.chart_records for delete using (user_id = auth.uid());
create policy "admins read charts" on public.chart_records for select using (public.is_pluto_admin());

create policy "users create anonymous events" on public.product_events for insert with check (user_id = auth.uid());
create policy "admins read events" on public.product_events for select using (public.is_pluto_admin());

create policy "admins read admin membership" on public.admin_users for select using (public.is_pluto_admin());
create policy "admins read audit logs" on public.admin_audit_logs for select using (public.is_pluto_admin());
create policy "admins create audit logs" on public.admin_audit_logs for insert with check (admin_user_id = auth.uid() and public.is_pluto_admin());

create index consent_records_user_id_idx on public.consent_records(user_id, recorded_at desc);
create index chart_records_user_id_idx on public.chart_records(user_id, created_at desc);
create index product_events_created_at_idx on public.product_events(created_at desc);

commit;
