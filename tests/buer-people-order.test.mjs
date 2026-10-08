import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {relationshipRepository} from '../src/services/buer-relationships.js';
const A='00000000-0000-4000-a000-000000000001',B='00000000-0000-4000-a000-000000000002';
const P='00000000-0000-4000-b000-000000000001',Q='00000000-0000-4000-b000-000000000002',X='00000000-0000-4000-b000-000000000003';
test('cloud order is isolated, validated, revision checked and does not change people',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 insert into auth.users values('${A}'),('${B}');
 create table public.buer_people(id uuid primary key,user_id uuid,is_self boolean default false,deleted_at timestamptz,revision integer default 1);
 insert into public.buer_people(id,user_id) values('${P}','${A}'),('${Q}','${A}'),('${X}','${B}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/202610080001_people_order.sql',import.meta.url),'utf8'));
 const as=owner=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`);
 const save=(ids,rev=0,mutation=A)=>db.query('select * from public.buer_save_people_order($1,$2,$3)',[rev,mutation,ids]);
 await as(A);assert.equal((await save([Q,P])).rows[0].revision,1);
 assert.deepEqual((await db.query('select person_ids from public.buer_people_order')).rows[0].person_ids,[Q,P]);
 assert.equal((await save([Q,P])).rows[0].revision,1);
 await assert.rejects(save([P,Q],0,B),/order_conflict/);
 assert.equal((await save([P,Q],1,B)).rows[0].revision,2);
 await assert.rejects(save([X],2,P),/profiles_changed/);
 await assert.rejects(save([P,P],2,P),/invalid_order/);
 await assert.rejects(save([null],2,P),/invalid_order/);
 await assert.rejects(db.query('update public.buer_people_order set revision=10'),/permission denied/);
 await as(B);assert.equal((await db.query('select * from public.buer_people_order')).rows.length,0);
 await assert.rejects(save([P]),/profiles_changed/);await save([X]);
 await db.exec(`reset role;update public.buer_people set deleted_at=now() where id='${Q}';`);
 await as(A);await assert.rejects(save([P,Q],2,P),/profiles_changed/);
 assert.equal((await save([P],2,P)).rows[0].revision,3);
 await db.exec('reset role');assert.ok((await db.query('select revision from public.buer_people')).rows.every(x=>x.revision===1));
 await db.exec('set role anon');await assert.rejects(save([]),/permission denied/);
 }finally{await db.close();}
});
test('order repository rejects late response after account switch',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r);
 const account={user:{id:A},client:{from:()=>({select(){return this},eq(){return this},limit(){return pending}})}};
 const request=relationshipRepository(account).order(A);account.user={id:B};resolve({data:[{person_ids:[P]}],error:null});
 await assert.rejects(request,/ACCOUNT_CHANGED/);
});
