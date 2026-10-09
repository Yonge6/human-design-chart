import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGuideSource,cleanGuideSource,PAIR_SECTIONS,parsePairSections,pairManualStale} from '../src/services/buer-pair-manual.js';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {loadPairManualContext} from '../api/relationship-context.mjs';
import {validateConversation} from '../api/chat.mjs';
const A='00000000-0000-4000-a000-000000000001',B='00000000-0000-4000-a000-000000000002',P='00000000-0000-4000-b000-000000000001';
test('pair source includes all canonical growth records and chart structures without identifying input',()=>{
 const source=makeGuideSource({Properties:{Type:'Generator'},Name:'secret','Defined Centers':['sacral'],Channels:[[34,20]],Personality:{Sun:{Gate:34,Line:2}},Design:{Sun:{Gate:20,Line:1}}},{answers:{q1:'answer'},report:'full report',stories:[{id:'private',body:'not excerpted',useAI:false}],actions:[{id:'action',reflection:'reflection'}]});
 assert.equal(source.growth.stories[0].body,'not excerpted');assert.equal(source.growth.report,'full report');assert.equal(source.growth.actions[0].reflection,'reflection');assert.equal(source.chart.personality.Sun.Gate,34);assert.deepEqual(source.chart.channels,[[34,20]]);assert.ok(!JSON.stringify(source).includes('secret'));assert.deepEqual(cleanGuideSource(source),source);
});
test('guide context includes every growth record and excludes other accounts',async()=>{
 const source=makeGuideSource({Properties:{Type:'Generator'}},{stories:Array.from({length:20},(_,i)=>({id:String(i),body:`full record ${i}`,useAI:false}))});
 const other={id:P,user_id:A,revision:1,is_self:false,birth:{certainty:'unknown'},chart:null,relationship:'朋友'};
 const history={id:'00000000-0000-4000-b000-000000000099',user_id:A,person_id:P,updated_at:'2026-10-09T00:00:00Z',messages:[{role:'user',content:'我们讨论事情时经常节奏不同。'},{role:'assistant',content:'可以约定稍后再确认。'}]};
 const opts={environment:{BUER_ACCOUNT_URL:'https://example.test',BUER_ACCOUNT_PUBLISHABLE_KEY:'public'},fetchImpl:async url=>Response.json(url.endsWith('/auth/v1/user')?{id:A}:url.includes('buer_people')?[other]:url.includes('buer_relationship_conversations')?[history]:[{user_id:A,payload:source,revision:1}])};
 const selection={personId:P,personRevision:1,sourceRevision:1};
 const ctx=await loadPairManualContext(selection,'Bearer test',opts);assert.equal(ctx.me.growth.stories.length,20);assert.equal(ctx.me.growth.stories[19].body,'full record 19');assert.match(ctx.relationshipHistory[0].body,/节奏不同/);assert.equal(ctx.sources.at(-1).kind,'relationship-history');
 assert.ok(validateConversation({mode:'relationship-guide',relationship:selection,messages:[{role:'user',content:'guide'}]},ctx)[0].content.includes('JSON'));
 other.user_id=B;await assert.rejects(loadPairManualContext(selection,'Bearer test',opts),/PROFILES_CHANGED/);
 await assert.rejects(loadPairManualContext(selection,'',opts),/SIGN_IN_REQUIRED/);
});
test('pair manual SQL isolates owners, preserves versions and cleans soft deletion',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;insert into auth.users values('${A}'),('${B}');
 create table public.buer_people(id uuid primary key,user_id uuid,is_self boolean default false,deleted_at timestamptz,revision integer default 1);insert into public.buer_people(id,user_id) values('${P}','${A}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/202610080002_pair_manual.sql',import.meta.url),'utf8'));
 const as=owner=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`);
 const payload=makeGuideSource(null,{}),sections=Object.fromEntries(PAIR_SECTIONS.map(([k])=>[k,'reading']));
 const source=(rev=0,mutation=A)=>db.query('select * from public.buer_save_guide_source($1,$2,$3)',[rev,mutation,payload]);
 const save=(rev=0,srev=1,mutation=A)=>db.query('select * from public.buer_save_pair_manual($1,1,$2,$3,$4,$5,$6)',[P,srev,rev,mutation,sections,'zh']);
 await as(A);await source();await save();assert.equal((await save()).rows[0].revision,1);
 await assert.rejects(save(0,1,B),/manual_conflict/);await assert.rejects(db.query('update public.buer_pair_manuals set revision=99'),/permission denied/);
 await source(1,B);await assert.rejects(save(1,1,B),/profiles_changed/);assert.equal((await db.query('select * from public.buer_pair_manuals')).rows[0].sections.overview,'reading');
 assert.equal((await save(1,2,B)).rows[0].revision,2);
 await as(B);assert.equal((await db.query('select * from public.buer_pair_manuals')).rows.length,0);assert.equal((await db.query('select * from public.buer_guide_sources')).rows.length,0);await source();await assert.rejects(save(),/profiles_changed/);
 await db.exec(`reset role;update public.buer_people set deleted_at=now() where id='${P}'`);await as(A);assert.equal((await db.query('select * from public.buer_pair_manuals')).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(source(),/permission denied/);
 }finally{await db.close();}
});
test('pair manual requires six complete categories and flags changed revisions',()=>{
 const sections=Object.fromEntries(PAIR_SECTIONS.map(([k])=>[k,'Some reading']));assert.deepEqual(parsePairSections(JSON.stringify(sections)),sections);
 assert.throws(()=>parsePairSections('{"overview":"only one"}'));assert.throws(()=>parsePairSections(JSON.stringify({...sections,repair:''})));
 assert.equal(pairManualStale({source_revision:2,person_revision:3},{revision:2},{revision:3}),false);
 assert.equal(pairManualStale({source_revision:2,person_revision:3},{revision:3},{revision:3}),true);
});
