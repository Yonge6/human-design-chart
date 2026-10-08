begin;
create table public.buer_people_order (
 user_id uuid primary key references auth.users(id) on delete cascade,
 person_ids uuid[] not null default '{}' check(cardinality(person_ids)<=100),
 revision integer not null default 1 check(revision>0),
 mutation_id uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.buer_people_order enable row level security;
alter table public.buer_people_order force row level security;
revoke all on public.buer_people_order from public,anon,authenticated;
grant select on public.buer_people_order to authenticated;
create policy people_order_owner on public.buer_people_order for select to authenticated using(user_id=(select auth.uid()));
create function public.buer_save_people_order(expected_revision integer,mutation uuid,ordered_ids uuid[])
returns public.buer_people_order language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();saved public.buer_people_order;
begin
 if owner is null then raise exception 'sign_in_required' using errcode='28000';end if;
 if expected_revision is null or expected_revision<0 or mutation is null or ordered_ids is null
 or cardinality(ordered_ids)>100 or coalesce(array_ndims(ordered_ids),1)<>1
 or array_position(ordered_ids,null) is not null
 or (select count(distinct id) from unnest(ordered_ids) id)<>cardinality(ordered_ids)
 then raise exception 'invalid_order' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,22));
 if (select count(*) from public.buer_people where user_id=owner and not is_self and deleted_at is null and id=any(ordered_ids))<>cardinality(ordered_ids)
 then raise exception 'profiles_changed' using errcode='40001';end if;
 select * into saved from public.buer_people_order where user_id=owner;
 if found and saved.mutation_id=mutation then return saved;end if;
 if expected_revision=0 then
 insert into public.buer_people_order(user_id,person_ids,mutation_id) values(owner,ordered_ids,mutation)
 on conflict(user_id) do nothing returning * into saved;
 else
 update public.buer_people_order set person_ids=ordered_ids,revision=revision+1,mutation_id=mutation,updated_at=clock_timestamp()
 where user_id=owner and revision=expected_revision returning * into saved;
 end if;
 if saved.user_id is null then raise exception 'order_conflict' using errcode='40001';end if;
 return saved;
end $$;
revoke all on function public.buer_save_people_order(integer,uuid,uuid[]) from public,anon;
grant execute on function public.buer_save_people_order(integer,uuid,uuid[]) to authenticated;
commit;
