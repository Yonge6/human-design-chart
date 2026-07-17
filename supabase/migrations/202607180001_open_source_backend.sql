begin;

create extension if not exists pgcrypto;

create table public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  sequence_no bigint generated always as identity unique,
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

create table public.data_deletion_audit_logs (
  id bigint generated always as identity primary key,
  subject_hash text not null check (subject_hash ~ '^sha256:[a-f0-9]{64}$'),
  request_id uuid not null unique,
  deleted_chart_count integer not null default 0 check (deleted_chart_count >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

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
        or item.key not in (
          'language', 'setting', 'enabled', 'environment', 'schemaVersion',
          'engineVersion', 'category', 'format', 'surface', 'platform'
        )
    )
    and not exists (
      select 1 from jsonb_each(properties) as item
      where regexp_replace(lower(item.key), '[^a-z0-9]', '', 'g') = any(array[
        'name', 'birthdate', 'birthtime', 'location', 'locationlabel', 'query',
        'latitude', 'longitude', 'coordinates', 'chart', 'snapshot', 'text',
        'contacts', 'clipboard', 'useragent', 'stack'
      ])
    );
$$;

create or replace function public.has_current_consent(consent_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case consent_kind
      when 'cloud_chart_storage' then record.cloud_save
      when 'product_analytics' then record.product_analytics
      else false
    end
    from public.consent_records as record
    where record.user_id = auth.uid()
    order by record.sequence_no desc
    limit 1
  ), false);
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
alter table public.data_deletion_audit_logs enable row level security;

create policy "users read own profile" on public.app_users for select using (id = auth.uid());
create policy "users create own profile" on public.app_users for insert with check (id = auth.uid());
create policy "users update own profile" on public.app_users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins read user profiles" on public.app_users for select using (public.is_pluto_admin());

create policy "users read own consent" on public.consent_records for select using (user_id = auth.uid());
create policy "users create own consent" on public.consent_records for insert with check (user_id = auth.uid());
create policy "admins read consent" on public.consent_records for select using (public.is_pluto_admin());

create policy "users read own charts" on public.chart_records for select using (user_id = auth.uid());
create policy "users create own charts" on public.chart_records for insert with check (
  user_id = auth.uid() and public.has_current_consent('cloud_chart_storage')
);
create policy "users update own charts" on public.chart_records for update using (
  user_id = auth.uid() and public.has_current_consent('cloud_chart_storage')
) with check (
  user_id = auth.uid() and public.has_current_consent('cloud_chart_storage')
);
create policy "users delete own charts" on public.chart_records for delete using (user_id = auth.uid());
create policy "admins read charts" on public.chart_records for select using (public.is_pluto_admin());

create policy "users create anonymous events" on public.product_events for insert with check (
  user_id = auth.uid() and public.has_current_consent('product_analytics')
);
create policy "admins read events" on public.product_events for select using (public.is_pluto_admin());

create policy "admins read admin membership" on public.admin_users for select using (public.is_pluto_admin());
create policy "admins read audit logs" on public.admin_audit_logs for select using (public.is_pluto_admin());
create policy "admins create audit logs" on public.admin_audit_logs for insert with check (admin_user_id = auth.uid() and public.is_pluto_admin());

create index consent_records_user_id_idx on public.consent_records(user_id, sequence_no desc);
create index chart_records_user_id_idx on public.chart_records(user_id, created_at desc);
create index product_events_created_at_idx on public.product_events(created_at desc);
create index data_deletion_audit_logs_created_at_idx on public.data_deletion_audit_logs(created_at desc);

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant select, insert, update on public.app_users to authenticated;
grant select, insert on public.consent_records to authenticated;
grant select, insert, update, delete on public.chart_records to authenticated;
grant insert on public.product_events to authenticated;
grant select on public.admin_users, public.admin_audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_pluto_admin() to authenticated;
grant execute on function public.has_current_consent(text) to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
revoke all on public.data_deletion_audit_logs from anon, authenticated;

commit;
