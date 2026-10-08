begin;
create table public.buer_workspace_records (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('chat','manual','answer','story','action','growth_meta','conflict')),
 record_id text not null check(char_length(record_id) between 1 and 512),
 payload jsonb,
 deleted boolean not null default false,
 revision integer not null default 1 check(revision>0),
 mutation_id uuid not null,
 updated_at timestamptz not null default now(),
 primary key(user_id,kind,record_id),
 check((deleted and payload is null) or (not deleted and payload is not null and jsonb_typeof(payload)='object' and octet_length(payload::text)<=1200000))
);
alter table public.buer_workspace_records enable row level security;
alter table public.buer_workspace_records force row level security;
revoke all on public.buer_workspace_records from public,anon,authenticated;
grant select on public.buer_workspace_records to authenticated;
create policy workspace_owner on public.buer_workspace_records for select to authenticated using(user_id=(select auth.uid()));

create function public.buer_save_workspace_record(record_kind text,record_key text,expected_revision integer,mutation uuid,record_payload jsonb,is_deleted boolean default false)
returns public.buer_workspace_records language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();saved public.buer_workspace_records;
begin
 if owner is null then raise exception 'sign_in_required' using errcode='28000';end if;
 if record_kind is null or record_kind not in ('chat','manual','answer','story','action','growth_meta','conflict')
 or record_key is null or char_length(record_key) not between 1 and 512
 or expected_revision is null or expected_revision<0 or mutation is null or is_deleted is null
 or (is_deleted and record_payload is not null)
 or (not is_deleted and (record_payload is null or jsonb_typeof(record_payload)<>'object' or octet_length(record_payload::text)>1200000))
 then raise exception 'invalid_workspace_record' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,71));
 select * into saved from public.buer_workspace_records where user_id=owner and kind=record_kind and record_id=record_key;
 if found then
  if saved.mutation_id=mutation then
   if saved.payload is distinct from record_payload or saved.deleted<>is_deleted then raise exception 'mutation_reused' using errcode='22023';end if;
   return saved;
  end if;
  if saved.revision<>expected_revision then raise exception 'workspace_conflict' using errcode='40001';end if;
  update public.buer_workspace_records set payload=record_payload,deleted=is_deleted,revision=revision+1,mutation_id=mutation,updated_at=clock_timestamp()
   where user_id=owner and kind=record_kind and record_id=record_key returning * into saved;
 else
  if expected_revision<>0 then raise exception 'workspace_conflict' using errcode='40001';end if;
  if (select count(*) from public.buer_workspace_records where user_id=owner)>=5000
   then raise exception 'workspace_capacity' using errcode='54000';end if;
  insert into public.buer_workspace_records(user_id,kind,record_id,payload,deleted,mutation_id)
   values(owner,record_kind,record_key,record_payload,is_deleted,mutation) returning * into saved;
 end if;
 return saved;
end $$;
revoke all on function public.buer_save_workspace_record(text,text,integer,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.buer_save_workspace_record(text,text,integer,uuid,jsonb,boolean) to authenticated;
commit;
