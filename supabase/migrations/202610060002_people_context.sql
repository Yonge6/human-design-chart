begin;
create table public.buer_personal_context (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=900000),
 revision integer not null default 1 check(revision>0), mutation_id uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.buer_personal_context enable row level security;
alter table public.buer_personal_context force row level security;
revoke all on public.buer_personal_context from public,anon,authenticated;
grant select on public.buer_personal_context to authenticated;
create policy personal_context_owner on public.buer_personal_context for select to authenticated using(user_id=(select auth.uid()));
create function public.buer_save_personal_context(expected_revision integer,mutation uuid,context_payload jsonb)
returns public.buer_personal_context language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();saved public.buer_personal_context; k text;
begin
 if owner is null then raise exception 'sign_in_required' using errcode='28000';end if;
 if expected_revision is null or expected_revision<0 or mutation is null or context_payload is null
 or jsonb_typeof(context_payload)<>'object' or octet_length(context_payload::text)>900000
 or not(context_payload ?& array['version','scopes','chart','answers','stories','actions','chats'])
 or (context_payload-array['version','scopes','chart','answers','stories','actions','chats'])<>'{}'::jsonb
 or context_payload->>'version'<>'2' or jsonb_typeof(context_payload->'scopes')<>'object'
 then raise exception 'invalid_context' using errcode='22023';end if;
 foreach k in array array['chart','growth','journal','history'] loop
 if not(context_payload->'scopes' ? k) or jsonb_typeof(context_payload->'scopes'->k)<>'boolean' then raise exception 'invalid_scope' using errcode='22023';end if;
 end loop;
 foreach k in array array['answers','stories','actions','chats'] loop
 if jsonb_typeof(context_payload->k)<>'array' then raise exception 'invalid_context' using errcode='22023';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,21));
 select * into saved from public.buer_personal_context where user_id=owner;
 if found and saved.mutation_id=mutation then return saved;end if;
 if expected_revision=0 then
 insert into public.buer_personal_context(user_id,payload,mutation_id) values(owner,context_payload,mutation) on conflict(user_id) do nothing returning * into saved;
 else
 update public.buer_personal_context set payload=context_payload,revision=revision+1,mutation_id=mutation,updated_at=clock_timestamp()
 where user_id=owner and revision=expected_revision returning * into saved;
 end if;
 if saved.user_id is null then raise exception 'context_conflict' using errcode='40001';end if;
 return saved;
end $$;
revoke all on function public.buer_save_personal_context(integer,uuid,jsonb) from public,anon;
grant execute on function public.buer_save_personal_context(integer,uuid,jsonb) to authenticated;

alter table public.buer_relationship_conversations alter column self_id drop not null;
alter table public.buer_relationship_conversations alter column self_revision drop not null;
alter table public.buer_relationship_conversations add column context_revision integer;
create function public.buer_save_people_conversation(conversation_id uuid,expected_revision integer,mutation uuid,
 other_id uuid,other_revision integer,personal_revision integer,conversation_messages jsonb)
returns public.buer_relationship_conversations language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();saved public.buer_relationship_conversations;message jsonb;
begin
 if owner is null then raise exception 'sign_in_required' using errcode='28000';end if;
 if conversation_id is null or mutation is null or expected_revision is null or expected_revision<0 or other_id is null
 or other_revision is null or personal_revision is null or personal_revision<0
 or conversation_messages is null or jsonb_typeof(conversation_messages)<>'array'
 or jsonb_array_length(conversation_messages)>40 or octet_length(conversation_messages::text)>160000
 then raise exception 'invalid_conversation' using errcode='22023';end if;
 for message in select value from jsonb_array_elements(conversation_messages) loop
 if jsonb_typeof(message)<>'object' or not(message ?& array['role','content']) or (message-array['role','content'])<>'{}'::jsonb
 or message->>'role' not in ('user','assistant') or jsonb_typeof(message->'content')<>'string' or char_length(message->>'content')>6000
 then raise exception 'invalid_message' using errcode='22023';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,21));
 if not exists(select 1 from public.buer_people where id=other_id and user_id=owner and not is_self and deleted_at is null and revision=other_revision)
 or coalesce((select revision from public.buer_personal_context where user_id=owner),0)<>personal_revision
 then raise exception 'profiles_changed' using errcode='40001';end if;
 select * into saved from public.buer_relationship_conversations where id=conversation_id and user_id=owner;
 if found and saved.mutation_id=mutation then return saved;end if;
 if expected_revision=0 then
 if(select count(*) from public.buer_relationship_conversations where user_id=owner)>=500 then raise exception 'conversation_limit' using errcode='54000';end if;
 insert into public.buer_relationship_conversations(id,user_id,person_id,person_revision,context_revision,messages,mutation_id)
 values(conversation_id,owner,other_id,other_revision,personal_revision,conversation_messages,mutation) on conflict(id) do nothing returning * into saved;
 else
 update public.buer_relationship_conversations set messages=conversation_messages,revision=revision+1,mutation_id=mutation,updated_at=clock_timestamp()
 where id=conversation_id and user_id=owner and self_id is null and person_id=other_id and person_revision=other_revision and context_revision=personal_revision and revision=expected_revision returning * into saved;
 end if;
 if saved.id is null then raise exception 'conversation_conflict' using errcode='40001';end if;return saved;
end $$;
revoke all on function public.buer_save_people_conversation(uuid,integer,uuid,uuid,integer,integer,jsonb) from public,anon;
grant execute on function public.buer_save_people_conversation(uuid,integer,uuid,uuid,integer,integer,jsonb) to authenticated;
commit;
