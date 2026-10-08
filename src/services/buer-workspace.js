import {createWorkspaceSync,workspaceRepository} from './buer-workspace-sync.js';
import {stableJson} from './buer-workspace-json.js';
import {LEGACY_WORKSPACE_KEYS,LEGACY_OWNER_KEY,workspaceRecords,workspaceValues,migrateLegacyWorkspace} from './buer-workspace-data.js';

const names=['chats','growth','manuals'];
const keyOf=r=>JSON.stringify([r.kind,r.id]);
const equal=(a,b)=>stableJson(a)===stableJson(b);
const empty=()=>({chats:[],growth:{},manuals:[]});
// UI writes are immutable, uniquely keyed transactions. Only the lock holder
// folds them into the cache / talks to the server. A suspended tab cannot erase
// another tab's pending edits, and a crash between fold and removal is retryable.
export function createWorkspace({storage,repository,locks,uuid=()=>crypto.randomUUID(),emit=()=>{}}){
 let owner=null,epoch=0,state={status:'local',pending:0,conflicts:0},running=null;
 const prefix=id=>`buer:workspace:op:${id||'guest'}:`;
 const ops=id=>Object.keys(storage).filter(k=>k.startsWith(prefix(id))).sort().map(key=>({key,...JSON.parse(storage.getItem(key))}));
 const engine=createWorkspaceSync({storage,repository,uuid,notify:value=>{state=value;}});
 const locked=fn=>locks?.request?locks.request('buer-workspace-writer',fn):Promise.reject(Error('WORKSPACE_LOCK_UNAVAILABLE'));
 function cached(id){const raw=storage.getItem(`buer:workspace:v1:${id}`);if(!raw)return [];const value=JSON.parse(raw);if(value.owner!==id||value.version!==1||!Array.isArray(value.rows))throw Error('WORKSPACE_CACHE_INVALID');return value.rows;}
 function records(){
  let rows;
  if(owner)rows=cached(owner);
  else if(!storage.getItem(LEGACY_OWNER_KEY)){const values=empty();LEGACY_WORKSPACE_KEYS.forEach((key,i)=>{const raw=storage.getItem(key);if(raw)values[names[i]]=JSON.parse(raw);});rows=workspaceRecords(values);}
  else rows=[];
  const map=new Map(rows.map(r=>[keyOf(r),r]));
  for(const op of ops(owner))for(const change of op.changes)map.set(keyOf(change),change);
  return [...map.values()];
 }
 function publish(reason='data'){emit({reason,owner,epoch,...state,pending:ops(owner).length+(state.pending||0)});}
 function append(changes){
  if(!changes.length)return;
  storage.setItem(prefix(owner)+String(Date.now()).padStart(16,'0')+':'+uuid(),JSON.stringify({changes}));
  state={...state,status:owner?'pending':'local'};publish('write');
 }
 function applyOperations(identity){
  for(const op of ops(identity)){
   engine.applyChanges(op.changes);
   storage.removeItem(op.key); // only after the complete transaction is durable
  }
 }
 const api={
  get owner(){return owner;},get epoch(){return epoch;},get state(){return {...state,pending:ops(owner).length+(state.pending||0)};},
  records,values:()=>workspaceValues(records()),
  storage(){
   let ticket=epoch;const baseline=new Map();
   return {
    getItem(key){if(!LEGACY_WORKSPACE_KEYS.includes(key))return storage.getItem(key);ticket=epoch;const value=api.values()[names[LEGACY_WORKSPACE_KEYS.indexOf(key)]];baseline.set(key,structuredClone(value));return JSON.stringify(value);},
    setItem(key,raw){
     if(!LEGACY_WORKSPACE_KEYS.includes(key))throw Error('INVALID_WORKSPACE_KEY');if(ticket!==epoch)throw Error('ACCOUNT_CHANGED');
     const name=names[LEGACY_WORKSPACE_KEYS.indexOf(key)],next=JSON.parse(raw),before=baseline.get(key);
     if(before===undefined)throw Error('WORKSPACE_READ_REQUIRED');
     const toRows=value=>workspaceRecords({...empty(),[name]:value});
     const previous=new Map(toRows(before).map(r=>[keyOf(r),r]));const after=new Map(toRows(next).map(r=>[keyOf(r),r]));
     const changes=[];
     for(const [key,r] of after){const old=previous.get(key);if(!equal(old?.payload,r.payload))changes.push({...r,deleted:false,base:old?.payload??null});}
     for(const [key,r] of previous)if(!after.has(key)&&r.kind!=='growth_meta')changes.push({kind:r.kind,id:r.id,payload:null,deleted:true,base:r.payload});
     append(changes);baseline.set(key,structuredClone(next));
    },
    removeItem(key){this.setItem(key,JSON.stringify(key===LEGACY_WORKSPACE_KEYS[1]?{}:[]));},
   };
  },
  async activate(identity){
   if(owner===identity)return;
   owner=identity;const ticket=++epoch;engine.activate(null);state={status:identity?'loading':'local',pending:0,conflicts:0};publish('identity');
   if(!identity)return;
   try{await locked(async()=>{
    if(ticket!==epoch)return;engine.activate(identity);migrateLegacyWorkspace({storage,sync:engine});
    // Guest transactions are claimed durably before removal. Never import any
    // previous account cache, even when the browser switches accounts.
    for(const op of ops(null)){engine.applyChanges(op.changes);storage.removeItem(op.key);}
    publish();
   });if(ticket===epoch)await api.sync();}catch(error){if(ticket===epoch){state={...state,status:'offline'};publish();}throw error;}
  },
  async sync(){
   if(!owner)return;if(running?.epoch===epoch)return running.promise;
   const ticket=epoch,identity=owner;
   const promise=locked(async()=>{
    if(ticket!==epoch)return;engine.activate(identity);applyOperations(identity);
    try{await engine.sync();}finally{if(ticket===epoch)publish();}
   });running={epoch:ticket,promise};try{await promise;}finally{if(running?.promise===promise)running=null;}
  },
  async restore(id){const ticket=epoch;await locked(()=>{if(ticket!==epoch)throw Error('ACCOUNT_CHANGED');engine.activate(owner);applyOperations(owner);engine.restoreConflict(id);publish();});await api.sync();},
  async removeAccount(identity){await locked(()=>{engine.removeLocal(identity);for(const op of ops(identity))storage.removeItem(op.key);});},
  changed(){publish('external');},
 };
 return api;
}

let instance;
const listeners=new Set();
export function workspace(){
 if(!instance){
  let account=null,timer;
  const repo={list:id=>workspaceRepository(account).list(id),save:(id,row)=>workspaceRepository(account).save(id,row)};
  let storage;try{storage=globalThis.localStorage;}catch{}
  storage ||= {getItem:()=>null,setItem:()=>{throw Error('LOCAL_STORAGE_UNAVAILABLE');},removeItem:()=>{throw Error('LOCAL_STORAGE_UNAVAILABLE');}};
  instance=createWorkspace({storage,repository:repo,locks:globalThis.navigator?.locks,emit:detail=>{
   for(const listener of listeners)listener(detail);
   if(detail.owner&&detail.pending&&detail.status!=='offline'){clearTimeout(timer);timer=setTimeout(()=>instance.sync().catch(()=>{}),700);}
  }});
  instance.bind=next=>{account=next;next?.subscribe(user=>{void instance.activate(user?.id||null).catch(()=>{});});};
  globalThis.addEventListener?.('online',()=>instance.sync().catch(()=>{}));
  globalThis.addEventListener?.('storage',event=>{if(event.key?.startsWith('buer:workspace:'))instance.changed();});
  globalThis.document?.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void instance.sync().catch(()=>{});});
 }
 return instance;
}
export const workspaceStorage=()=>workspace().storage();
export const onWorkspaceChange=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
