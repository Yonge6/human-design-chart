-- Private owner-scoped people. A person's account is never created by this table.
begin;
create table public.buer_people (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 60),
  relationship text not null check (char_length(relationship) between 1 and 60),
  is_self boolean not null default false,
  source text not null check (source in ('self','permission','confirmed','guardian')),
  birth jsonb not null default '{}'::jsonb check (jsonb_typeof(birth) = 'object' and octet_length(birth::text) <= 2000),
  chart jsonb check (chart is null or (jsonb_typeof(chart) = 'object' and octet_length(chart::text) <= 24000)),
  notes text not null default '' check (char_length(notes) <= 2000),
  revision integer not null default 1 check (revision > 0),
  mutation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, id)
);
create unique index buer_one_self on public.buer_people(user_id) where is_self and deleted_at is null;
create index buer_people_owner on public.buer_people(user_id, updated_at desc);
alter table public.buer_people enable row level security;
alter table public.buer_people force row level security;
revoke all on public.buer_people from public, anon, authenticated;
grant select on public.buer_people to authenticated;
create policy people_owner_read on public.buer_people for select to authenticated using (user_id = (select auth.uid()));

create table public.buer_relationship_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  self_id uuid not null,
  person_id uuid not null,
  self_revision integer not null,
  person_revision integer not null,
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 40 and octet_length(messages::text) <= 160000),
  revision integer not null default 1,
  mutation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, self_id) references public.buer_people(user_id, id) on delete cascade,
  foreign key (user_id, person_id) references public.buer_people(user_id, id) on delete cascade,
  check (self_id <> person_id)
);
create index buer_relationship_owner on public.buer_relationship_conversations(user_id, person_id, updated_at desc);
alter table public.buer_relationship_conversations enable row level security;
alter table public.buer_relationship_conversations force row level security;
revoke all on public.buer_relationship_conversations from public, anon, authenticated;
grant select on public.buer_relationship_conversations to authenticated;
create policy relationship_owner_read on public.buer_relationship_conversations for select to authenticated using (user_id = (select auth.uid()));

create function public.buer_save_person(person_id uuid, expected_revision integer, mutation uuid, person jsonb)
returns public.buer_people language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); saved public.buer_people;
begin
  if owner is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  if person_id is null or mutation is null or expected_revision is null or expected_revision < 0
    or person is null or jsonb_typeof(person) <> 'object'
    or not (person ?& array['nickname','relationship','is_self','source','birth','chart','notes'])
    or (person - array['nickname','relationship','is_self','source','birth','chart','notes']) <> '{}'::jsonb
    or jsonb_typeof(person->'is_self') <> 'boolean'
    or jsonb_typeof(person->'nickname') <> 'string' or jsonb_typeof(person->'relationship') <> 'string'
    or jsonb_typeof(person->'source') <> 'string' or jsonb_typeof(person->'notes') <> 'string'
    or ((person->>'is_self')::boolean and person->>'source' <> 'self')
    or (not (person->>'is_self')::boolean and person->>'source' = 'self')
    then raise exception 'invalid_person' using errcode = '22023'; end if;
  -- Serialize per owner for the profile limit, single-self invariant and deletion.
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 21));
  select * into saved from public.buer_people where id = person_id and user_id = owner;
  if found and saved.mutation_id = mutation and saved.deleted_at is null then return saved; end if;
  if expected_revision = 0 then
    if (select count(*) from public.buer_people where user_id = owner and deleted_at is null) >= 100 then
      raise exception 'profile_limit' using errcode = '54000'; end if;
    insert into public.buer_people(id,user_id,nickname,relationship,is_self,source,birth,chart,notes,mutation_id)
      values(person_id,owner,btrim(person->>'nickname'),btrim(person->>'relationship'),(person->>'is_self')::boolean,
        person->>'source',person->'birth',nullif(person->'chart','null'::jsonb),person->>'notes',mutation)
      on conflict (id) do nothing returning * into saved;
  else
    update public.buer_people set nickname=btrim(person->>'nickname'),relationship=btrim(person->>'relationship'),
      is_self=(person->>'is_self')::boolean,source=person->>'source',birth=person->'birth',
      chart=nullif(person->'chart','null'::jsonb),notes=person->>'notes',revision=revision+1,
      mutation_id=mutation,updated_at=clock_timestamp()
      where id=person_id and user_id=owner and revision=expected_revision and deleted_at is null returning * into saved;
  end if;
  if saved.id is null then raise exception 'profile_conflict' using errcode='40001'; end if;
  return saved;
end $$;

create function public.buer_delete_person(person_id uuid, expected_revision integer, mutation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); saved public.buer_people;
begin
  if owner is null then raise exception 'sign_in_required' using errcode='28000'; end if;
  if person_id is null or mutation is null then raise exception 'invalid_person' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,21));
  select * into saved from public.buer_people where id=person_id and user_id=owner;
  if found and saved.mutation_id=mutation and saved.deleted_at is not null then return true; end if;
  update public.buer_people set nickname='deleted',relationship='deleted',birth='{}',chart=null,notes='',
    is_self=false,deleted_at=clock_timestamp(),updated_at=clock_timestamp(),revision=revision+1,mutation_id=mutation
    where id=person_id and user_id=owner and revision=expected_revision and deleted_at is null returning * into saved;
  if saved.id is null then raise exception 'profile_conflict' using errcode='40001'; end if;
  delete from public.buer_relationship_conversations c where c.user_id=owner and (c.self_id=person_id or c.person_id=person_id);
  return true;
end $$;

create function public.buer_save_relationship_conversation(conversation_id uuid, expected_revision integer, mutation uuid,
  own_id uuid, other_id uuid, own_revision integer, other_revision integer, conversation_messages jsonb)
returns public.buer_relationship_conversations language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); saved public.buer_relationship_conversations; message jsonb;
begin
  if owner is null then raise exception 'sign_in_required' using errcode='28000'; end if;
  if conversation_id is null or mutation is null or expected_revision is null or expected_revision<0
    or own_id is null or other_id is null or own_id=other_id
    or conversation_messages is null or jsonb_typeof(conversation_messages)<>'array'
    or jsonb_array_length(conversation_messages)>40 or octet_length(conversation_messages::text)>160000
    then raise exception 'invalid_conversation' using errcode='22023'; end if;
  for message in select value from jsonb_array_elements(conversation_messages) loop
    if jsonb_typeof(message)<>'object' or not (message ?& array['role','content'])
      or (message-array['role','content'])<>'{}'::jsonb
      or message->>'role' not in ('user','assistant') or jsonb_typeof(message->'content')<>'string'
      or char_length(message->>'content')>6000 then raise exception 'invalid_message' using errcode='22023'; end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,21));
  if not exists(select 1 from public.buer_people where id=own_id and user_id=owner and is_self and deleted_at is null and revision=own_revision)
    or not exists(select 1 from public.buer_people where id=other_id and user_id=owner and not is_self and deleted_at is null and revision=other_revision)
    then raise exception 'profiles_changed' using errcode='40001'; end if;
  select * into saved from public.buer_relationship_conversations where id=conversation_id and user_id=owner;
  if found and saved.mutation_id=mutation then return saved; end if;
  if expected_revision=0 then
    if (select count(*) from public.buer_relationship_conversations where user_id=owner)>=500 then raise exception 'conversation_limit' using errcode='54000'; end if;
    insert into public.buer_relationship_conversations(id,user_id,self_id,person_id,self_revision,person_revision,messages,mutation_id)
      values(conversation_id,owner,own_id,other_id,own_revision,other_revision,conversation_messages,mutation)
      on conflict(id) do nothing returning * into saved;
  else
    update public.buer_relationship_conversations set messages=conversation_messages,revision=revision+1,mutation_id=mutation,updated_at=clock_timestamp()
      where id=conversation_id and user_id=owner and self_id=own_id and person_id=other_id
        and self_revision=own_revision and person_revision=other_revision and revision=expected_revision returning * into saved;
  end if;
  if saved.id is null then raise exception 'conversation_conflict' using errcode='40001'; end if;
  return saved;
end $$;

revoke all on function public.buer_save_person(uuid,integer,uuid,jsonb) from public, anon;
revoke all on function public.buer_delete_person(uuid,integer,uuid) from public, anon;
revoke all on function public.buer_save_relationship_conversation(uuid,integer,uuid,uuid,uuid,integer,integer,jsonb) from public, anon;
grant execute on function public.buer_save_person(uuid,integer,uuid,jsonb) to authenticated;
grant execute on function public.buer_delete_person(uuid,integer,uuid) to authenticated;
grant execute on function public.buer_save_relationship_conversation(uuid,integer,uuid,uuid,uuid,integer,integer,jsonb) to authenticated;
commit;
