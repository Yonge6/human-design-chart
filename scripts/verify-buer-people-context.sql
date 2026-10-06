begin;
insert into auth.users(id,email) values
 ('f6b50000-0000-4000-a000-000000000001','buer-people-a@example.invalid'),
 ('f6b50000-0000-4000-a000-000000000002','buer-people-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f6b50000-0000-4000-a000-000000000001',true);
select public.buer_save_person('f6b50000-0000-4000-b000-000000000002',0,'f6b50000-0000-4000-c000-000000000001',
 '{"nickname":"People QA","relationship":"朋友","is_self":false,"source":"permission","birth":{"certainty":"unknown","date":"","time":"","timezone":"Asia/Shanghai","location":""},"chart":null,"notes":""}');
select public.buer_save_personal_context(0,'f6b50000-0000-4000-c000-000000000002',
 '{"version":2,"scopes":{"chart":false,"growth":false,"journal":false,"history":false},"chart":null,"answers":[],"stories":[],"actions":[],"chats":[]}');
select public.buer_save_people_conversation('f6b50000-0000-4000-d000-000000000001',0,'f6b50000-0000-4000-c000-000000000003',
 'f6b50000-0000-4000-b000-000000000002',1,1,'[{"role":"user","content":"Synthetic: no self-person required"}]');
select set_config('request.jwt.claim.sub','f6b50000-0000-4000-a000-000000000002',true);
do $$begin
 if exists(select 1 from public.buer_personal_context) or exists(select 1 from public.buer_relationship_conversations)
 then raise exception 'CONTEXT_ISOLATION_FAILED';end if;
 begin
 perform public.buer_save_people_conversation('f6b50000-0000-4000-d000-000000000002',0,'f6b50000-0000-4000-c000-000000000004',
 'f6b50000-0000-4000-b000-000000000002',1,0,'[{"role":"user","content":"cross-account denied"}]');
 raise exception 'OWNER_CHECK_FAILED';exception when serialization_failure then null;end;
end$$;
rollback;
select 'PEOPLE_CONTEXT_RLS_PASS_ROLLED_BACK' as result;
