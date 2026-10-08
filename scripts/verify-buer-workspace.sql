-- Production-safe contract probe: all synthetic users and rows roll back.
begin;
insert into auth.users(id) values ('a2601008-0000-4000-8000-000000000001'),('a2601008-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','a2601008-0000-4000-8000-000000000001',true);
select public.buer_save_workspace_record('story','qa-workspace',0,'a2601008-0000-4000-8000-000000000003','{"id":"qa-workspace","body":"synthetic"}'::jsonb,false);
do $$begin
 if (select count(*) from public.buer_workspace_records)<>1 then raise exception 'owner read failed';end if;
 begin
  perform public.buer_save_workspace_record('story','qa-workspace',0,'a2601008-0000-4000-8000-000000000004','{"body":"conflict"}'::jsonb,false);
  raise exception 'CAS failed';
 exception when serialization_failure then null;end;
end$$;
select set_config('request.jwt.claim.sub','a2601008-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.buer_workspace_records) then raise exception 'account isolation failed';end if;
end$$;
reset role;
rollback;
select c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced,
 not has_table_privilege('anon','public.buer_workspace_records','SELECT') as anon_blocked,
 not has_table_privilege('authenticated','public.buer_workspace_records','INSERT') as direct_insert_blocked,
 not has_function_privilege('anon','public.buer_save_workspace_record(text,text,integer,uuid,jsonb,boolean)','EXECUTE') as anon_rpc_blocked,
 exists(select 1 from pg_constraint where conrelid=c.oid and confdeltype='c') as account_delete_cascades,
 not exists(select 1 from auth.users where id in ('a2601008-0000-4000-8000-000000000001','a2601008-0000-4000-8000-000000000002')) as qa_users_rolled_back,
 'owner read, isolation and CAS passed' as contract
from pg_class c where c.oid='public.buer_workspace_records'::regclass;
