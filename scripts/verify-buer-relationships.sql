-- Transactional production RLS smoke test. All synthetic identities and records
-- are rolled back; no existing account or profile is read or modified.
begin;
insert into auth.users(id,email) values
 ('f6b50000-0000-4000-a000-000000000001','buer-rls-a@example.invalid'),
 ('f6b50000-0000-4000-a000-000000000002','buer-rls-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f6b50000-0000-4000-a000-000000000001',true);
select public.buer_save_person('f6b50000-0000-4000-b000-000000000001',0,'f6b50000-0000-4000-c000-000000000001',
 '{"nickname":"QA self","relationship":"self","is_self":true,"source":"self","birth":{"certainty":"unknown","date":"","time":"","timezone":"Asia/Shanghai","location":""},"chart":null,"notes":""}');
select public.buer_save_person('f6b50000-0000-4000-b000-000000000002',0,'f6b50000-0000-4000-c000-000000000002',
 '{"nickname":"QA partner","relationship":"partner","is_self":false,"source":"permission","birth":{"certainty":"unknown","date":"","time":"","timezone":"Asia/Shanghai","location":""},"chart":null,"notes":""}');
select public.buer_save_relationship_conversation('f6b50000-0000-4000-d000-000000000001',0,'f6b50000-0000-4000-c000-000000000003',
 'f6b50000-0000-4000-b000-000000000001','f6b50000-0000-4000-b000-000000000002',1,1,'[{"role":"user","content":"synthetic QA"}]');
select set_config('request.jwt.claim.sub','f6b50000-0000-4000-a000-000000000002',true);
do $$begin
 if exists(select 1 from public.buer_people) or exists(select 1 from public.buer_relationship_conversations)
 then raise exception 'RLS_ISOLATION_FAILED'; end if;
 begin
  perform public.buer_delete_person('f6b50000-0000-4000-b000-000000000001',1,'f6b50000-0000-4000-c000-000000000004');
  raise exception 'CROSS_OWNER_DELETE_ALLOWED';
 exception when serialization_failure then null; end;
end$$;
select set_config('request.jwt.claim.sub','f6b50000-0000-4000-a000-000000000001',true);
select public.buer_delete_person('f6b50000-0000-4000-b000-000000000002',1,'f6b50000-0000-4000-c000-000000000005');
do $$begin
 if exists(select 1 from public.buer_relationship_conversations)
 then raise exception 'CONVERSATION_DELETE_FAILED'; end if;
end$$;
select public.buer_delete_person('f6b50000-0000-4000-b000-000000000001',1,'f6b50000-0000-4000-c000-000000000006');
do $$begin
 if exists(select 1 from public.buer_people where deleted_at is null)
 then raise exception 'SELF_DELETE_FAILED'; end if;
end$$;
rollback;
select 'RELATIONSHIP_RLS_PASS_ROLLED_BACK' as result;
