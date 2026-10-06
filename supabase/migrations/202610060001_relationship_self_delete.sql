-- Keep the identity/source invariant on scrubbed tombstones. The partial
-- unique index excludes deleted rows, so a new self profile can be created.
create or replace function public.buer_delete_person(person_id uuid, expected_revision integer, mutation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); saved public.buer_people;
begin
  if owner is null then raise exception 'sign_in_required' using errcode='28000'; end if;
  if person_id is null or mutation is null then raise exception 'invalid_person' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,21));
  select * into saved from public.buer_people where id=person_id and user_id=owner;
  if found and saved.mutation_id=mutation and saved.deleted_at is not null then return true; end if;
  update public.buer_people set nickname='deleted',relationship='deleted',birth='{}',chart=null,notes='',
    deleted_at=clock_timestamp(),updated_at=clock_timestamp(),revision=revision+1,mutation_id=mutation
    where id=person_id and user_id=owner and revision=expected_revision and deleted_at is null returning * into saved;
  if saved.id is null then raise exception 'profile_conflict' using errcode='40001'; end if;
  delete from public.buer_relationship_conversations c where c.user_id=owner and (c.self_id=$1 or c.person_id=$1);
  return true;
end $$;
