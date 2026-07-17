begin;

alter table public.chart_records
  add column verification_status text not null default 'client_asserted'
  check (verification_status in ('client_asserted', 'engine_verified'));

update public.chart_records
set snapshot = jsonb_set(snapshot, '{verificationStatus}', '"client_asserted"'::jsonb, true)
where not snapshot ? 'verificationStatus';

alter table public.chart_records alter column verification_status drop default;
alter table public.chart_records
  add constraint chart_records_snapshot_provenance_consistent check (
    snapshot->>'chartHash' = chart_hash
    and snapshot->>'schemaVersion' = schema_version
    and snapshot->>'engineVersion' = engine_version
    and snapshot->>'verificationStatus' = verification_status
  );

alter table public.data_deletion_audit_logs
  add constraint data_deletion_audit_logs_subject_hash_key unique (subject_hash);
alter table public.data_deletion_audit_logs
  add column deidentified_event_count integer not null default 0 check (deidentified_event_count >= 0);

drop policy if exists "users create own charts" on public.chart_records;
drop policy if exists "users update own charts" on public.chart_records;
drop policy if exists "users create anonymous events" on public.product_events;
revoke insert, update on public.chart_records from authenticated;
revoke insert on public.product_events from authenticated;

create or replace function public.product_event_properties_are_safe(properties jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  item record;
  scalar_value text;
begin
  if jsonb_typeof(properties) <> 'object' or octet_length(properties::text) > 2048 then
    return false;
  end if;
  for item in select * from jsonb_each(properties)
  loop
    if item.key not in (
      'language', 'setting', 'enabled', 'environment', 'schemaVersion',
      'engineVersion', 'category', 'format', 'surface', 'platform'
    ) then
      return false;
    end if;
    if item.key = 'enabled' then
      if jsonb_typeof(item.value) <> 'boolean' then return false; end if;
      continue;
    end if;
    if jsonb_typeof(item.value) <> 'string' then return false; end if;
    scalar_value := item.value #>> '{}';
    if char_length(scalar_value) > 64 then return false; end if;
    if item.key = 'language' and scalar_value not in ('zh', 'en') then return false; end if;
    if item.key = 'environment' and scalar_value not in ('production', 'development', 'test') then return false; end if;
    if item.key = 'platform' and scalar_value not in ('web', 'ios', 'android', 'unknown') then return false; end if;
    if item.key = 'surface' and scalar_value not in ('form', 'result', 'detail', 'settings', 'history') then return false; end if;
    if item.key = 'format' and scalar_value not in ('image', 'link', 'native_share', 'download') then return false; end if;
    if item.key = 'category' and scalar_value not in ('validation', 'calculation', 'network', 'engine', 'cancelled') then return false; end if;
    if item.key = 'setting' and scalar_value not in ('privacyMode', 'cloudSave', 'productAnalytics', 'localHistory') then return false; end if;
    if item.key = 'schemaVersion' and scalar_value <> '1.0' then return false; end if;
    if item.key = 'engineVersion' and scalar_value <> '1.0.0' then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.save_client_asserted_chart(
  p_user_id uuid,
  p_chart_hash text,
  p_schema_version text,
  p_engine_version text,
  p_name text,
  p_birth_date date,
  p_birth_time time,
  p_location_label text,
  p_timezone text,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
  cloud_allowed boolean;
begin
  select coalesce(record.cloud_save, false) into cloud_allowed
  from public.consent_records as record
  where record.user_id = p_user_id
  order by record.sequence_no desc
  limit 1;
  if not coalesce(cloud_allowed, false) then raise exception 'CLOUD_STORAGE_CONSENT_REQUIRED'; end if;
  if p_schema_version <> '1.0' or p_engine_version <> '1.0.0' then raise exception 'UNSUPPORTED_PROFILE_VERSION'; end if;
  if p_snapshot->>'verificationStatus' <> 'client_asserted'
    or p_snapshot->>'chartHash' <> p_chart_hash
    or p_snapshot->>'schemaVersion' <> p_schema_version
    or p_snapshot->>'engineVersion' <> p_engine_version then
    raise exception 'INVALID_CLIENT_ASSERTED_SNAPSHOT';
  end if;
  insert into public.chart_records (
    user_id, chart_hash, schema_version, engine_version, verification_status,
    name, birth_date, birth_time, location_label, timezone, snapshot
  ) values (
    p_user_id, p_chart_hash, p_schema_version, p_engine_version, 'client_asserted',
    p_name, p_birth_date, p_birth_time, p_location_label, p_timezone, p_snapshot
  )
  on conflict (user_id, chart_hash) do update set
    schema_version = excluded.schema_version,
    engine_version = excluded.engine_version,
    verification_status = 'client_asserted',
    name = excluded.name,
    birth_date = excluded.birth_date,
    birth_time = excluded.birth_time,
    location_label = excluded.location_label,
    timezone = excluded.timezone,
    snapshot = excluded.snapshot
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.record_product_event(
  p_user_id uuid,
  p_event_name text,
  p_properties jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
  analytics_allowed boolean;
begin
  select coalesce(record.product_analytics, false) into analytics_allowed
  from public.consent_records as record
  where record.user_id = p_user_id
  order by record.sequence_no desc
  limit 1;
  if not coalesce(analytics_allowed, false) then raise exception 'ANALYTICS_CONSENT_REQUIRED'; end if;
  if p_event_name not in (
    'app_open', 'form_started', 'chart_generate_started', 'chart_generate_succeeded',
    'chart_generate_failed', 'detail_opened', 'poster_saved', 'share_started',
    'share_completed', 'share_cancelled', 'language_changed', 'privacy_mode_changed'
  ) or not public.product_event_properties_are_safe(p_properties) then
    raise exception 'INVALID_PRODUCT_EVENT';
  end if;
  insert into public.product_events (user_id, event_name, properties)
  values (p_user_id, p_event_name, p_properties)
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.delete_cloud_personal_data(p_user_id uuid)
returns table(request_id uuid, deleted_chart_count integer, deidentified_event_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  receipt_request_id uuid;
  chart_count integer;
  event_count integer;
  hashed_subject text;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  hashed_subject := 'sha256:' || encode(extensions.digest(p_user_id::text, 'sha256'), 'hex');
  select count(*)::integer into chart_count from public.chart_records where user_id = p_user_id;
  select count(*)::integer into event_count from public.product_events where user_id = p_user_id;

  insert into public.data_deletion_audit_logs (subject_hash, request_id, deleted_chart_count, deidentified_event_count)
  values (hashed_subject, gen_random_uuid(), chart_count, event_count)
  on conflict (subject_hash) do nothing;

  update public.product_events set user_id = null where user_id = p_user_id;
  delete from public.chart_records where user_id = p_user_id;
  delete from public.consent_records where user_id = p_user_id;
  delete from public.app_users where id = p_user_id;

  select logs.request_id, logs.deleted_chart_count, logs.deidentified_event_count
  into receipt_request_id, chart_count, event_count
  from public.data_deletion_audit_logs as logs
  where logs.subject_hash = hashed_subject;
  return query select receipt_request_id, chart_count, event_count;
end;
$$;

create or replace function public.cleanup_expired_privacy_records(p_now timestamptz default now())
returns table(product_events_deleted bigint, deletion_receipts_deleted bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  events_count bigint;
  receipts_count bigint;
begin
  delete from public.product_events where created_at < p_now - interval '180 days';
  get diagnostics events_count = row_count;
  delete from public.data_deletion_audit_logs where created_at < p_now - interval '365 days';
  get diagnostics receipts_count = row_count;
  return query select events_count, receipts_count;
end;
$$;

revoke all on function public.save_client_asserted_chart(uuid,text,text,text,text,date,time,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.record_product_event(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.delete_cloud_personal_data(uuid) from public, anon, authenticated;
revoke all on function public.cleanup_expired_privacy_records(timestamptz) from public, anon, authenticated;
grant execute on function public.save_client_asserted_chart(uuid,text,text,text,text,date,time,text,text,jsonb) to service_role;
grant execute on function public.record_product_event(uuid,text,jsonb) to service_role;
grant execute on function public.delete_cloud_personal_data(uuid) to service_role;
grant execute on function public.cleanup_expired_privacy_records(timestamptz) to service_role;

commit;
