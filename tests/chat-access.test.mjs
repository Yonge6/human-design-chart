import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createChatAccess,DAILY_FREE_LIMIT,accountGrantVerifier} from '../api/chat-access.mjs';
const body={installationId:'11111111-1111-4111-8111-111111111111'};
test('quota reserves concurrent requests, refunds failures, persists and resets next UTC day',async()=>{
const file=join(mkdtempSync(join(tmpdir(),'buer-quota-')),'usage.json');let date=Date.UTC(2026,8,22);const make=()=>createChatAccess({file,now:()=>date});let a=make();const r=await Promise.all(Array.from({length:DAILY_FREE_LIMIT},()=>a.reserve(body)));await assert.rejects(a.reserve(body),/DAILY_LIMIT/);r[0].finish(false);r.slice(1).forEach(x=>x.finish(true));(await a.reserve(body)).finish(true);a=make();await assert.rejects(a.reserve(body),/DAILY_LIMIT/);date+=86400000;(await a.reserve(body)).finish(true);
});
test('only verified membership skips quota',async()=>{const a=createChatAccess({verify:async proof=>proof==='verified'});for(let i=0;i<DAILY_FREE_LIMIT+1;i++)(await a.reserve({...body,transactionJWS:'verified'})).finish(true);for(let i=0;i<DAILY_FREE_LIMIT;i++)(await a.reserve({...body,transactionJWS:'forged'})).finish(true);await assert.rejects(a.reserve(body),/DAILY_LIMIT/);});
test('account grant requires the authenticated user to match the server allowlist',async()=>{
 const id='22222222-2222-4222-8222-222222222222';
 const env={BUER_GRANTED_USERS:id,BUER_ACCOUNT_URL:'https://example.com',BUER_ACCOUNT_PUBLISHABLE_KEY:'public'};
 const fetchImpl=async(url,options)=>({ok:options.headers.Authorization==='Bearer valid',json:async()=>({id})});
 const verify=accountGrantVerifier(env,fetchImpl);
 assert.equal(await verify('Bearer valid'),true);
 assert.equal(await verify('Bearer forged'),false);
 assert.equal(await verify('Bearer '+id),false);
 assert.equal(await verify(undefined),false);
 assert.equal(await accountGrantVerifier({...env,BUER_GRANTED_USERS:'33333333-3333-4333-8333-333333333333'},fetchImpl)('Bearer valid'),false);
 assert.equal(await accountGrantVerifier({...env,BUER_ACCOUNT_URL:'http://example.com'},fetchImpl)('Bearer valid'),false);
 const a=createChatAccess();for(let i=0;i<DAILY_FREE_LIMIT+1;i++)(await a.reserve(body,true)).finish(true);
 for(let i=0;i<DAILY_FREE_LIMIT;i++)(await a.reserve(body,false)).finish(true);
 await assert.rejects(a.reserve(body,false),/DAILY_LIMIT/);
});
