import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceSync,workspaceRepository} from '../src/services/buer-workspace-sync.js';
import {workspaceRecords,workspaceValues,migrateLegacyWorkspace,LEGACY_OWNER_KEY} from '../src/services/buer-workspace-data.js';
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
function repository(){
 const rows=new Map();let offline=false;
 return {rows,setOffline:v=>offline=v,
  async list(owner){if(offline)throw Error('offline');return structuredClone([...rows.values()].filter(x=>x.user_id===owner));},
  async save(owner,row){
   if(offline)throw Error('offline');const key=JSON.stringify([owner,row.kind,row.id]),old=rows.get(key);
   if(old?.mutation_id===row.mutation)return structuredClone(old);
   if((old?.revision||0)!==row.revision)throw Object.assign(Error('workspace_conflict'),{code:'40001'});
   const next={user_id:owner,kind:row.kind,record_id:row.id,payload:structuredClone(row.payload),deleted:row.deleted,revision:row.revision+1,mutation_id:row.mutation};rows.set(key,next);return structuredClone(next);
  },
 };
}
function client(repo,disk=storage()){const sync=createWorkspaceSync({storage:disk,repository:repo});sync.activate('account-a');return sync;}
test('separate devices merge inserts, keep offline edits across restarts and propagate tombstones',async()=>{
 const repo=repository(),disk=storage(),a=client(repo,disk),b=client(repo);
 a.set('story','one',{body:'one'});await a.sync();await b.sync();
 b.set('story','two',{body:'two'});repo.setOffline(true);await assert.rejects(b.sync(),/offline/);
 a.set('story','one',{body:'offline change'});await assert.rejects(a.sync(),/offline/);
 const resumed=client(repo,disk);assert.equal(resumed.records()[0].payload.body,'offline change');repo.setOffline(false);
 await resumed.sync();await b.sync();await resumed.sync();assert.equal(resumed.records().filter(x=>!x.deleted).length,2);
 b.set('story','one',null,true);await b.sync();await resumed.sync();assert.equal(resumed.records().find(x=>x.id==='one').deleted,true);
 const fresh=client(repo);await fresh.sync();assert.equal(fresh.records().find(x=>x.id==='one').deleted,true);
});
test('concurrent edits preserve the cloud version and upload the local version as a recovery record',async()=>{
 const repo=repository(),a=client(repo),b=client(repo);
 a.set('answer','q1',{value:'base'});await a.sync();await b.sync();
 a.set('answer','q1',{value:'A'});b.set('answer','q1',{value:'B'});await a.sync();await b.sync();
 assert.equal(b.status,'synced');const values=workspaceValues(b.records());assert.equal(values.growth.answers.q1,'A');assert.equal(values.conflicts[0].payload.value,'B');
 await a.sync();assert.equal(workspaceValues(a.records()).conflicts[0].payload.value,'B');
 b.restoreConflict(values.conflicts[0].id);await b.sync();await a.sync();assert.equal(workspaceValues(a.records()).growth.answers.q1,'B');
 assert.ok(workspaceValues(a.records()).conflicts.some(x=>x.payload.value==='A'));
});
test('offline changes cannot resurrect a remote deletion and remain recoverable',async()=>{
 const repo=repository(),a=client(repo),b=client(repo);a.set('story','one',{body:'base'});await a.sync();await b.sync();
 a.set('story','one',null,true);await a.sync();b.set('story','one',{body:'offline edit'});await b.sync();
 assert.equal(b.records().find(x=>x.kind==='story').deleted,true);assert.equal(workspaceValues(b.records()).conflicts[0].payload.body,'offline edit');
});
test('a later local edit during an in-flight save retains its payload and advances only the base revision',async()=>{
 const repo=repository(),a=client(repo);let release;const save=repo.save;
 repo.save=async(...args)=>{await new Promise(resolve=>release=resolve);return save(...args);};
 a.set('story','one',{body:'first'});const running=a.sync();while(!release)await new Promise(resolve=>setImmediate(resolve));
 a.set('story','one',{body:'second'});release();await running;
 assert.equal(a.records()[0].payload.body,'second');assert.equal(a.records()[0].revision,1);assert.equal(a.records()[0].pending,true);
 repo.save=save;await a.sync();assert.equal((await repo.list('account-a'))[0].payload.body,'second');
});
test('switching accounts drops displayed records and ignores late network completions',async()=>{
 const disk=storage(),repo=repository(),a=client(repo,disk);a.set('story','private',{body:'A only'});
 let release;const list=repo.list;repo.list=()=>new Promise(resolve=>release=resolve);
 const running=a.sync();a.activate('account-b');release([]);await running;
 assert.equal(a.owner,'account-b');assert.deepEqual(a.records(),[]);assert.equal(repo.rows.size,0);
 a.activate(null);assert.deepEqual(a.records(),[]);assert.throws(()=>a.set('story','x',{}),/SIGN_IN_REQUIRED/);
 a.activate('account-a');assert.equal(a.records()[0].payload.body,'A only');repo.list=list;await a.sync();
 a.removeLocal('account-a');assert.equal(a.owner,null);assert.equal(disk.getItem('buer:workspace:v1:account-a'),null);
});
test('unavailable storage or a changed tab never reports data saved or overwrites a newer cache',()=>{
 const disk=storage(),repo=repository(),a=client(repo,disk),b=client(repo,disk);
 a.set('story','one',{body:'kept'});assert.throws(()=>b.set('story','two',{body:'draft'}),/WORKSPACE_OTHER_TAB/);
 const resumed=client(repo,disk);assert.equal(resumed.records()[0].payload.body,'kept');
 disk.setItem=()=>{throw Error('quota');};assert.throws(()=>resumed.set('story','one',{body:'not persisted'}),/quota/);
 assert.equal(resumed.records()[0].payload.body,'kept');
});
test('automatic legacy import claims exactly one account and never reads credentials or analytics keys',()=>{
 const disk=storage(),repo=repository(),a=client(repo,disk);
 disk.setItem('buer-conversations-v1',JSON.stringify([{id:'chat1',date:1,messages:[{role:'user',content:'hello'}]}]));
 disk.setItem('buer-growth-profile-v1',JSON.stringify({answers:{q1:'answer'},stories:[{id:'s',body:'private',useAI:false}],report:'saved report'}));
 disk.setItem('pluto-chart-history-v1',JSON.stringify([{id:'m',data:{Properties:{Name:'me'},Meta:{BirthIso:'x'}},input:{name:'me'}}]));
 disk.setItem('buer-auth-v1','secret');
 const result=migrateLegacyWorkspace({storage:disk,sync:a});assert.equal(result.imported,5);assert.equal(disk.getItem(LEGACY_OWNER_KEY),'account-a');assert.equal(disk.getItem('buer-conversations-v1'),null);
 assert.ok(!JSON.stringify(a.records()).includes('secret'));assert.equal(disk.getItem('buer-auth-v1'),'secret');
 a.activate('account-b');assert.equal(migrateLegacyWorkspace({storage:disk,sync:a}).imported,0);assert.deepEqual(a.records(),[]);
 a.activate('account-a');assert.equal(a.records().length,5);
});
test('failed legacy migration leaves the originals unclaimed and intact; duplicate imports preserve variants once',()=>{
 const disk=storage(),a=client(repository(),disk);disk.setItem('buer-conversations-v1','invalid');
 assert.throws(()=>migrateLegacyWorkspace({storage:disk,sync:a}),/INVALID_LEGACY/);assert.equal(disk.getItem(LEGACY_OWNER_KEY),null);assert.equal(disk.getItem('buer-conversations-v1'),'invalid');
 a.set('answer','q1',{value:'cloud'});const incoming=[{kind:'answer',id:'q1',payload:{value:'device'}}];a.import(incoming);a.import(incoming);
 assert.equal(workspaceValues(a.records()).conflicts.length,1);assert.equal(workspaceValues(a.records()).growth.answers.q1,'cloud');
});
test('mapping does not truncate collections or omit full chart, report, action or permission data',()=>{
 const chats=Array.from({length:25},(_,i)=>({id:String(i),messages:[],date:i}));
 const records=workspaceRecords({chats,growth:{version:2,answers:{q1:'a'},report:'r',reportDate:'today',cursor:2,stories:[{id:'s',useAI:false,body:'body'}],actions:[{id:'a',done:true,reflection:'reflection'}]},manuals:[{id:'m',data:{Properties:{Type:'Generator'},Meta:{BirthIso:'date'},Design:{Sun:{Gate:1}}}}]});
 const value=workspaceValues(records);assert.equal(value.chats.length,25);assert.equal(value.growth.stories[0].useAI,false);assert.equal(value.growth.actions[0].reflection,'reflection');assert.equal(value.growth.reportDate,'today');assert.equal(value.manuals[0].data.Design.Sun.Gate,1);
});
test('repository rejects another owner before issuing requests and validates returned ownership',async()=>{
 let called=0;const account={user:{id:'account-a'},client:{from:()=>{called++;throw Error('should not request');}}};
 const repo=workspaceRepository(account);await assert.rejects(repo.list('account-b'),/ACCOUNT_CHANGED/);assert.equal(called,0);
 const a=createWorkspaceSync({storage:storage(),repository:{list:async()=>[{user_id:'account-b'}]}});a.activate('account-a');await assert.rejects(a.sync(),/INVALID_WORKSPACE_RESPONSE/);assert.deepEqual(a.records(),[]);
});
test('a committed save whose response was lost is acknowledged on retry without duplicating content',async()=>{
 const repo=repository(),disk=storage(),a=client(repo,disk),save=repo.save;let lost=true;
 repo.save=async(...args)=>{const result=await save(...args);if(lost){lost=false;throw Error('response lost');}return result;};
 a.set('story','one',{body:'keep'});await assert.rejects(a.sync(),/response lost/);
 const resumed=client(repo,disk);await resumed.sync();assert.equal(resumed.status,'synced');assert.equal(repo.rows.size,1);assert.equal(resumed.records()[0].revision,1);
});
test('legacy storage-full failure does not claim data or remove the only copy',()=>{
 const disk=storage(),a=client(repository(),disk),raw=JSON.stringify([{id:'one',messages:[]}]);disk.setItem('buer-conversations-v1',raw);
 disk.setItem=()=>{throw Error('quota');};assert.throws(()=>migrateLegacyWorkspace({storage:disk,sync:a}),/quota/);
 assert.equal(disk.getItem('buer-conversations-v1'),raw);assert.equal(disk.getItem(LEGACY_OWNER_KEY),null);assert.deepEqual(a.records(),[]);
});
test('a late push acknowledgement cannot populate the next account cache',async()=>{
 const repo=repository(),a=client(repo);let release;const save=repo.save;
 repo.save=async(...args)=>{await new Promise(resolve=>release=resolve);return save(...args);};
 a.set('story','one',{body:'A'});const running=a.sync();while(!release)await new Promise(resolve=>setImmediate(resolve));
 a.activate('account-b');release();await running;assert.equal(a.owner,'account-b');assert.deepEqual(a.records(),[]);
 assert.equal((await repo.list('account-a'))[0].payload.body,'A');assert.deepEqual(await repo.list('account-b'),[]);
});
