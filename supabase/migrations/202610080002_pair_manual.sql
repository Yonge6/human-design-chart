begin;
create table public.buer_guide_sources (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=900000),
 revision integer not null default 1, mutation_id uuid not null, updated_at timestamptz not null default now()
);
create table public.buer_pair_manuals (
 user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null references public.buer_people(id) on delete cascade,
 source_revision integer not null, person_revision integer not null,
 sections jsonb not null, language text not null check(language in ('zh','en')),
 revision integer not null default 1, mutation_id uuid not null, updated_at timestamptz not null default now(),
 primary key(user_id,person_id)
);
create index buer_pair_manual_person on public.buer_pair_manuals(person_id);
alter table public.buer_guide_sources enable row level security;
alter table public.buer_guide_sources force row level security;
alter table public.buer_pair_manuals enable row level security;
alter table public.buer_pair_manuals force row level security;
revoke all on public.buer_guide_sources,public.buer_pair_manuals from public,anon,authenticated;
grant select on public.buer_guide_sources,public.buer_pair_manuals to authenticated;
create policy guide_source_owner on public.buer_guide_sources for select to authenticated using(user_id=(select auth.uid()));
create policy pair_manual_owner on public.buer_pair_manuals for select to authenticated using(user_id=(select auth.uid()));
create function public.buer_save_guide_source(expected_revision integer,mutation uuid,source_payload jsonb)
returns public.buer_guide_sources language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();saved public.buer_guide_sources;
begin
 if owner is null then raise exception 'sign_in_required' using errcode='28000';end if;
 if expected_revision is null or expected_revision<0 or mutation is null or source_payload is null
 or jsonb_typeof(source_payload)<>'object' or octet_length(source_payload::text)>900000
 or not(source_payload ?& array['version','chart','growth']) or source_payload->>'version'<>'1'
 or (source_payload-array['version','chart','growth'])<>'{}'::jsonb or jsonb_typeof(source_payload->'growth')<>'object'
 then raise exception 'invalid_source' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,23));
 select * into saved from public.buer_guide_sources where user_id=owner;
 if found and saved.mutation_id=mutation then return saved;end if;
 if expected_revision=0 then
 insert into public.buer_guide_sources(user_id,payload,mutation_id) values(owner,source_payload,mutation)
 on conflict(user_id) do nothing returning * into saved;
 else
 update public.buer_guide_sources set payload=source_payload,revision=revision+1,mutation_id=mutation,updated_at=clock_timestamp()
 where user_id=owner and revision=expected_revision returning * into saved;
 end if;
 if saved.user_id is null then raise exception 'source_conflict' using errcode='40001';end if;
 return saved;
end $$;
create function public.buer_save_pair_manual(other_id uuid,other_revision integer,personal_revision integer,expected_revision integer,mutation uuid,reading_sections jsonb,reading_language text)
returns public.buer_pair_manuals language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();saved public.buer_pair_manuals;k text;
begin
 if owner is null then raise exception 'sign_in_required' using errcode='28000';end if;
 if other_id is null or mutation is null or expected_revision is null or expected_revision<0 or other_revision is null or personal_revision is null
 or reading_language is null or reading_language not in ('zh','en') or reading_sections is null or jsonb_typeof(reading_sections)<>'object'
 or not(reading_sections ?& array['overview','communication','rhythm','friction','repair','practice'])
 or (reading_sections-array['overview','communication','rhythm','friction','repair','practice'])<>'{}'::jsonb
 then raise exception 'invalid_manual' using errcode='22023';end if;
 foreach k in array array['overview','communication','rhythm','friction','repair','practice'] loop
 if jsonb_typeof(reading_sections->k)<>'string' or char_length(btrim(reading_sections->>k))=0 or char_length(reading_sections->>k)>6000
 then raise exception 'invalid_section' using errcode='22023';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,23));
 if not exists(select 1 from public.buer_people where id=other_id and user_id=owner and not is_self and deleted_at is null and revision=other_revision)
 or not exists(select 1 from public.buer_guide_sources where user_id=owner and revision=personal_revision)
 then raise exception 'profiles_changed' using errcode='40001';end if;
 select * into saved from public.buer_pair_manuals where user_id=owner and person_id=other_id;
 if found and saved.mutation_id=mutation then return saved;end if;
 if expected_revision=0 then
 insert into public.buer_pair_manuals(user_id,person_id,source_revision,person_revision,sections,language,mutation_id)
 values(owner,other_id,personal_revision,other_revision,reading_sections,reading_language,mutation)
 on conflict(user_id,person_id) do nothing returning * into saved;
 else
 update public.buer_pair_manuals set source_revision=personal_revision,person_revision=other_revision,sections=reading_sections,language=reading_language,revision=revision+1,mutation_id=mutation,updated_at=clock_timestamp()
 where user_id=owner and person_id=other_id and revision=expected_revision returning * into saved;
 end if;
 if saved.user_id is null then raise exception 'manual_conflict' using errcode='40001';end if;
 return saved;
end $$;
create function public.buer_remove_pair_manual_on_person_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.deleted_at is not null then delete from public.buer_pair_manuals where person_id=new.id;end if;
 return new;
end $$;
create trigger buer_pair_manual_delete after update of deleted_at on public.buer_people for each row execute function public.buer_remove_pair_manual_on_person_delete();
revoke all on function public.buer_remove_pair_manual_on_person_delete() from public,anon,authenticated;
revoke all on function public.buer_save_guide_source(integer,uuid,jsonb),public.buer_save_pair_manual(uuid,integer,integer,integer,uuid,jsonb,text) from public,anon;
grant execute on function public.buer_save_guide_source(integer,uuid,jsonb),public.buer_save_pair_manual(uuid,integer,integer,integer,uuid,jsonb,text) to authenticated;
commit;
