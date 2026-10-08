import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace} from '../src/services/buer-workspace.js';
const CHAT='buer-conversations-v1',GROWTH='buer-growth-profile-v1';
function storage(){const data={};return new Proxy(data,{get:(t,k)=>k==='getItem'?(k=>t[k]??null):k==='setItem'?((k,v)=>{t[k]=v;}):k==='removeItem'?(k=>delete t[k]):t[k]});}
function repository(){const rows=new Map();return {rows,async list(owner){return structuredClone([...rows.values()].filter(r=>r.user_id===owner));},async save(owner,r){const key=owner+':'+r.kind+':'+r.id,old=rows.get(key);if(old?.mutation_id===r.mutation)return old;if((old?.revision||0)!==r.revision)throw Object.assign(Error('conflict'),{code:'40001'});const next={user_id:owner,kind:r.kind,record_id:r.id,payload:r.payload,deleted:r.deleted,revision:r.revision+1,mutation_id:r.mutation};rows.set(key,next);return structuredClone(next);}};}
function locks(){let queue=Promise.resolve();return {request:(_name,fn)=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;}};}
const chat=(id,text)=>({id,date:1,messages:[{role:'user',content:text,date:1}]});
const read=(s,key)=>JSON.parse(s.getItem(key));
test('UI guest history is durable, migrates automatically and never follows account switching',async()=>{
 const disk=storage(),repo=repository(),lock=locks();const a=createWorkspace({storage:disk,repository:repo,locks:lock});const s=a.storage();read(s,CHAT);s.setItem(CHAT,JSON.stringify([chat('one','guest')]));
 assert.equal(createWorkspace({storage:disk,repository:repo,locks:lock}).values().chats[0].id,'one');
 await a.activate('a');assert.equal(a.values().chats[0].id,'one');await a.activate('b');assert.equal(a.values().chats.length,0);
 assert.throws(()=>s.setItem(CHAT,'[]'),/ACCOUNT_CHANGED/);
 await a.activate(null);assert.equal(a.values().chats.length,0);read(s,CHAT);s.setItem(CHAT,JSON.stringify([chat('two','new guest')]));await a.activate('b');assert.deepEqual(a.values().chats.map(x=>x.id),['two']);
 await a.activate('a');assert.deepEqual(a.values().chats.map(x=>x.id),['one']);
});
test('two stale tabs preserve independent records and conflicting edits, including crash-safe pending ops',async()=>{
 const disk=storage(),repo=repository(),lock=locks();const a=createWorkspace({storage:disk,repository:repo,locks:lock}),b=createWorkspace({storage:disk,repository:repo,locks:lock});await a.activate('a');await b.activate('a');
 const sa=a.storage(),sb=b.storage();read(sa,CHAT);read(sb,CHAT);sa.setItem(CHAT,JSON.stringify([chat('one','A')]));sb.setItem(CHAT,JSON.stringify([chat('two','B')]));await Promise.all([a.sync(),b.sync()]);assert.equal(a.values().chats.length,2);
 const va=read(sa,CHAT),vb=read(sb,CHAT);va.find(c=>c.id==='one').messages[0].content='A changed';vb.find(c=>c.id==='one').messages[0].content='B changed';sa.setItem(CHAT,JSON.stringify(va));sb.setItem(CHAT,JSON.stringify(vb));await Promise.all([a.sync(),b.sync()]);
 const values=a.values();assert.equal(values.conflicts.length,1);assert.ok(JSON.stringify(values).includes('A changed'));assert.ok(JSON.stringify(values).includes('B changed'));
 await a.restore(values.conflicts[0].id);assert.equal(a.values().conflicts.length,1);
});
test('stale collections do not delete unseen remote inserts; explicit removal syncs',async()=>{
 const repo=repository(),a=createWorkspace({storage:storage(),repository:repo,locks:locks()}),b=createWorkspace({storage:storage(),repository:repo,locks:locks()});await a.activate('a');await b.activate('a');
 const sa=a.storage(),sb=b.storage();read(sa,GROWTH);read(sb,GROWTH);sa.setItem(GROWTH,JSON.stringify({answers:{q1:'one'},stories:[]}));await a.sync();sb.setItem(GROWTH,JSON.stringify({answers:{q2:'two'},stories:[]}));await b.sync();await a.sync();assert.deepEqual(a.values().growth.answers,{q1:'one',q2:'two'});
 read(sa,GROWTH);sa.removeItem(GROWTH);await a.sync();await b.sync();assert.deepEqual(b.values().growth.answers,{});
});
test('offline UI writes remain exportable and survive a fresh client',async()=>{
 const disk=storage(),repo=repository(),a=createWorkspace({storage:disk,repository:repo,locks:locks()});await a.activate('a');const s=a.storage();read(s,CHAT);s.setItem(CHAT,JSON.stringify([chat('one','offline')]));repo.list=async()=>{throw Error('offline');};await assert.rejects(a.sync());
 const fresh=createWorkspace({storage:disk,repository:repo,locks:locks()});await assert.rejects(fresh.activate('a'));assert.equal(fresh.values().chats[0].messages[0].content,'offline');assert.ok(fresh.state.pending);
});
