import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const A='00000000-0000-4000-a000-000000000001',B='00000000-0000-4000-a000-000000000002';
const M='00000000-0000-4000-b000-000000000001',N='00000000-0000-4000-b000-000000000002';
test('workspace RPC isolates accounts, checks versions, preserves deletions and rejects unsafe writes',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;insert into auth.users values('${A}'),('${B}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610080003_workspace_sync.sql',import.meta.url),'utf8'));
  const as=owner=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`);
  const save=(revision=0,mutation=M,payload={body:'private'},deleted=false,kind='story',id='one')=>db.query('select * from public.buer_save_workspace_record($1,$2,$3,$4,$5,$6)',[kind,id,revision,mutation,payload,deleted]);
  await as(A);
  const first=(await save()).rows[0];assert.equal(first.user_id,A);assert.equal(first.revision,1);
  assert.equal((await save()).rows[0].revision,1);
  await assert.rejects(save(0,M,{body:'different'}),/mutation_reused/);
  await assert.rejects(save(0,N),/workspace_conflict/);
  await assert.rejects(db.query("update public.buer_workspace_records set revision=99"),/permission denied/);
  await assert.rejects(db.query("delete from public.buer_workspace_records"),/permission denied/);
  await as(B);assert.equal((await db.query('select * from public.buer_workspace_records')).rows.length,0);
  assert.equal((await save()).rows[0].user_id,B);
  await as(A);
  const removed=(await save(1,N,null,true)).rows[0];assert.equal(removed.revision,2);assert.equal(removed.deleted,true);assert.equal(removed.payload,null);
  await assert.rejects(save(1,M),/workspace_conflict/);
  assert.equal((await save(1,N,null,true)).rows[0].revision,2);
  for(const args of [[0,M,{},false,'unknown'],[0,M,[],false],[0,M,null,false],[0,M,{},null],[null,M,{}],[0,null,{}],[0,M,{},false,'story',''],[0,M,{body:'x'.repeat(1200001)}]])await assert.rejects(save(...args),/invalid_workspace_record/);
  await db.exec('reset role;set role anon');await assert.rejects(save(),/permission denied/);
  await as('');await assert.rejects(save(),/sign_in_required/);
  await db.exec(`reset role;delete from auth.users where id='${A}'`);
  await as(A);assert.equal((await db.query('select * from public.buer_workspace_records')).rows.length,0);
  await as(B);assert.equal((await db.query('select * from public.buer_workspace_records')).rows.length,1);
 }finally{await db.close();}
});
