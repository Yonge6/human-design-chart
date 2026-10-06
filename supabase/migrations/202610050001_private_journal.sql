-- Run only in Buer's dedicated Auth project. No journal is public or AI context.
begin;

create table public.buer_journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 20000),
  mood text not null default '' check (mood in ('', 'calm', 'happy', 'tired', 'sad', 'anxious', 'mixed')),
  entry_date date not null,
  revision integer not null default 1 check (revision > 0),
  mutation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index buer_journal_owner_date on public.buer_journal_entries(user_id, entry_date desc, id);
alter table public.buer_journal_entries enable row level security;
alter table public.buer_journal_entries force row level security;
revoke all on public.buer_journal_entries from anon, authenticated;
grant select on public.buer_journal_entries to authenticated;
create policy journal_owner_read on public.buer_journal_entries for select to authenticated
  using (user_id = (select auth.uid()));

create function public.buer_save_journal(
  entry_id uuid, expected_revision integer, mutation uuid,
  entry_title text, entry_body text, entry_mood text, journal_date date
) returns public.buer_journal_entries
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); saved public.buer_journal_entries;
begin
  if owner is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  if mutation is null or entry_id is null or expected_revision is null or expected_revision < 0
    or journal_date is null or entry_title is null or entry_body is null or entry_mood is null
    or char_length(entry_title) > 120 or char_length(entry_body) > 20000
    or entry_mood not in ('', 'calm', 'happy', 'tired', 'sad', 'anxious', 'mixed')
    then raise exception 'invalid_entry' using errcode = '22023'; end if;
  -- Serialize mutations for this entry (including create retries).
  perform pg_advisory_xact_lock(hashtextextended(entry_id::text, 0));
  select * into saved from public.buer_journal_entries where id = entry_id and user_id = owner;
  if found and saved.mutation_id = mutation and saved.deleted_at is null then return saved; end if;
  if expected_revision = 0 then
    insert into public.buer_journal_entries(id, user_id, title, body, mood, entry_date, mutation_id)
      values(entry_id, owner, entry_title, entry_body, entry_mood, journal_date, mutation)
      on conflict (id) do nothing returning * into saved;
  else
    update public.buer_journal_entries set title = entry_title, body = entry_body, mood = entry_mood,
      entry_date = journal_date, revision = revision + 1, mutation_id = mutation, updated_at = clock_timestamp()
      where id = entry_id and user_id = owner and revision = expected_revision and deleted_at is null
      returning * into saved;
  end if;
  if saved.id is null then raise exception 'journal_conflict' using errcode = '40001'; end if;
  return saved;
end $$;

create function public.buer_delete_journal(entry_id uuid, expected_revision integer, mutation uuid)
returns public.buer_journal_entries
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); saved public.buer_journal_entries;
begin
  if owner is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  if mutation is null then raise exception 'invalid_mutation' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(entry_id::text, 0));
  select * into saved from public.buer_journal_entries where id = entry_id and user_id = owner;
  if found and saved.mutation_id = mutation and saved.deleted_at is not null then return saved; end if;
  update public.buer_journal_entries set body = '', title = '', mood = '', deleted_at = clock_timestamp(),
    updated_at = clock_timestamp(), revision = revision + 1, mutation_id = mutation
    where id = entry_id and user_id = owner and revision = expected_revision and deleted_at is null
    returning * into saved;
  if saved.id is null then raise exception 'journal_conflict' using errcode = '40001'; end if;
  return saved;
end $$;

create function public.buer_delete_account(confirmation text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
begin
  if owner is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  if confirmation is distinct from 'DELETE' then raise exception 'confirmation_required' using errcode = '22023'; end if;
  delete from auth.users where id = owner;
  return found;
end $$;

revoke all on function public.buer_save_journal(uuid, integer, uuid, text, text, text, date) from public, anon;
revoke all on function public.buer_delete_journal(uuid, integer, uuid) from public, anon;
revoke all on function public.buer_delete_account(text) from public, anon;
grant execute on function public.buer_save_journal(uuid, integer, uuid, text, text, text, date) to authenticated;
grant execute on function public.buer_delete_journal(uuid, integer, uuid) to authenticated;
grant execute on function public.buer_delete_account(text) to authenticated;
commit;
