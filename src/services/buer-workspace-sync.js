// Content-only sync foundation. UI integration is gated separately.
export const WORKSPACE_KINDS=['chat','manual','answer','story','action','growth_meta','conflict'];
const keyOf=(kind,id)=>JSON.stringify([kind,id]);
const clone=value=>structuredClone(value);
const equivalent=(a,b)=>a.deleted===b.deleted&&JSON.stringify(a.payload)===JSON.stringify(b.payload);
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=512;
export function validateWorkspaceValue(kind,id,payload,deleted=false){
 if(!WORKSPACE_KINDS.includes(kind)||!validId(id)||typeof deleted!=='boolean'
  ||(deleted?payload!==null:!payload||typeof payload!=='object'||Array.isArray(payload))
  ||new TextEncoder().encode(JSON.stringify(payload)).length>(kind==='conflict'?1150000:1000000))throw Error('INVALID_WORKSPACE_RECORD');
}
function remoteRecord(row,owner){
 if(row?.user_id!==owner||!Number.isInteger(row.revision)||row.revision<1||!validId(row.mutation_id))throw Error('INVALID_WORKSPACE_RESPONSE');
 validateWorkspaceValue(row.kind,row.record_id,row.payload,row.deleted);
 return {kind:row.kind,id:row.record_id,payload:clone(row.payload),deleted:row.deleted,revision:row.revision,mutation:row.mutation_id,pending:false};
}

export function workspaceRepository(account){
 const check=owner=>{if(!owner||account.user?.id!==owner)throw Error('ACCOUNT_CHANGED');};
 return {
  async list(owner){
   const rows=[];
   for(let offset=0;offset<=5000;offset+=250){
    check(owner);const {data,error}=await account.client.from('buer_workspace_records').select('*').eq('user_id',owner).order('kind').order('record_id').range(offset,offset+249);
    check(owner);if(error)throw error;if(!Array.isArray(data))throw Error('INVALID_WORKSPACE_RESPONSE');
    data.forEach(row=>remoteRecord(row,owner));rows.push(...data);
    if(data.length<250)return rows;
   }
   throw Error('WORKSPACE_CAPACITY');
  },
  async save(owner,row){
   check(owner);const {data,error}=await account.client.rpc('buer_save_workspace_record',{record_kind:row.kind,record_key:row.id,expected_revision:row.revision,mutation:row.mutation,record_payload:row.payload,is_deleted:row.deleted});
   check(owner);if(error)throw error;const saved=Array.isArray(data)?data[0]:data;remoteRecord(saved,owner);return saved;
  },
 };
}

export function createWorkspaceSync({storage,repository,uuid=()=>crypto.randomUUID(),notify=()=>{}}){
 let owner=null,epoch=0,rows={},sequence=0,running=null,status='locked';
 const namespace=identity=>`buer:workspace:v1:${identity}`;
 const publish=()=>notify({owner,status,pending:Object.values(rows).filter(x=>x.pending).length,conflicts:Object.values(rows).filter(x=>x.kind==='conflict'&&!x.deleted).length});
 function read(identity){
  const raw=storage.getItem(namespace(identity));if(!raw)return {sequence:0,rows:{}};
  let value;try{value=JSON.parse(raw);}catch{throw Error('WORKSPACE_CACHE_INVALID');}
  if(value.version!==1||value.owner!==identity||!Number.isInteger(value.sequence)||value.sequence<0||!Array.isArray(value.rows))throw Error('WORKSPACE_CACHE_INVALID');
  const result={};
  for(const row of value.rows){
   validateWorkspaceValue(row.kind,row.id,row.payload,row.deleted);
   if(!Number.isInteger(row.revision)||row.revision<0||typeof row.pending!=='boolean'||!validId(row.mutation)||result[keyOf(row.kind,row.id)])throw Error('WORKSPACE_CACHE_INVALID');
   result[keyOf(row.kind,row.id)]=row;
  }
  return {sequence:value.sequence,rows:result};
 }
 function commit(next){
  if(!owner)throw Error('SIGN_IN_REQUIRED');
  // Fail closed on another tab's write. The UI must reload/retain its draft,
  // never overwrite a workspace cache it did not read.
  if(read(owner).sequence!==sequence)throw Error('WORKSPACE_OTHER_TAB');
  storage.setItem(namespace(owner),JSON.stringify({version:1,owner,sequence:sequence+1,rows:Object.values(next)}));
  rows=next;sequence++;publish();
 }
 const fresh=(kind,id,payload,deleted=false,revision=0)=>({kind,id,payload:clone(payload),deleted,revision,mutation:uuid(),pending:true});
 function preserve(next,local,remoteRevision,reason){
  const id=uuid();next[keyOf('conflict',id)]=fresh('conflict',id,{kind:local.kind,id:local.id,payload:local.payload,deleted:local.deleted,remoteRevision,reason});
 }
 function merge(remoteRows){
  const next=clone(rows);
  for(const raw of remoteRows){
   const remote=remoteRecord(raw,owner),key=keyOf(remote.kind,remote.id),local=next[key];
   if(!local){next[key]=remote;continue;}
   if(remote.revision<local.revision)continue;
   if(!local.pending||equivalent(local,remote)){next[key]=remote;continue;}
   if(remote.revision===local.revision)continue;
   preserve(next,local,remote.revision,'concurrent-edit');next[key]=remote;
  }
  commit(next);
 }
 return {
  activate(identity){
   ++epoch;owner=null;rows={};sequence=0;running=null;status='locked';publish();
   if(!identity)return;
   if(!/^[a-zA-Z0-9-]{1,80}$/.test(identity))throw Error('INVALID_WORKSPACE_OWNER');
   const loaded=read(identity);owner=identity;rows=loaded.rows;sequence=loaded.sequence;status='local';publish();
  },
  get owner(){return owner;},
  get status(){return status;},
  records(){return clone(Object.values(rows));},
  set(kind,id,payload,deleted=false){
   validateWorkspaceValue(kind,id,payload,deleted);const key=keyOf(kind,id),before=rows[key];
   if(before&&equivalent(before,{payload,deleted}))return;
   commit({...rows,[key]:fresh(kind,id,payload,deleted,before?.revision||0)});status='pending';publish();
  },
  import(records){
   const next=clone(rows);
   for(const value of records){
    validateWorkspaceValue(value.kind,value.id,value.payload,false);const key=keyOf(value.kind,value.id),before=next[key];
    if(!before)next[key]=fresh(value.kind,value.id,value.payload);
    else if(!equivalent(before,{payload:value.payload,deleted:false})){
     const duplicate=Object.values(next).some(x=>x.kind==='conflict'&&!x.deleted&&x.payload.kind===value.kind&&x.payload.id===value.id&&JSON.stringify(x.payload.payload)===JSON.stringify(value.payload));
     if(!duplicate)preserve(next,{...value,deleted:false},before.revision,'legacy-import');
    }
   }
   commit(next);status='pending';publish();
  },
  // UI chooses which preserved version to restore, using the latest base revision.
  restoreConflict(id){
   const conflict=rows[keyOf('conflict',id)];if(!conflict||conflict.deleted)throw Error('CONFLICT_NOT_FOUND');
   const v=conflict.payload;validateWorkspaceValue(v.kind,v.id,v.payload,v.deleted);
   const next=clone(rows),key=keyOf(v.kind,v.id),current=next[key];
   if(current&&!current.deleted&&!equivalent(current,v))preserve(next,current,current.revision,'before-restore');
   next[key]=fresh(v.kind,v.id,v.payload,v.deleted,current?.revision||0);
   next[keyOf('conflict',id)]=fresh('conflict',id,null,true,conflict.revision);commit(next);status='pending';publish();
  },
  async sync(){
   if(!owner)throw Error('SIGN_IN_REQUIRED');if(running)return running;
   const identity=owner,ticket=epoch,current=()=>owner===identity&&epoch===ticket;
   const operation=(async()=>{
    status='syncing';publish();
    try{
     const remote=await repository.list(identity);if(!current())return;merge(remote);
     const queue=Object.values(rows).filter(row=>row.pending).map(clone);
     for(const outgoing of queue){
      if(!current())return;
      let raw;try{raw=await repository.save(identity,outgoing);}catch(error){
       if(!current())return;
       if(error.code==='40001'||error.message==='workspace_conflict'){
        const latest=await repository.list(identity);if(!current())return;merge(latest);continue;
       }
       throw error;
      }
      if(!current())return;
      const remote=remoteRecord(raw,identity),key=keyOf(outgoing.kind,outgoing.id),latest=rows[key];
      if(remote.kind!==outgoing.kind||remote.id!==outgoing.id||remote.mutation!==outgoing.mutation||!equivalent(remote,outgoing))throw Error('INVALID_WORKSPACE_RESPONSE');
      const next=clone(rows);
      next[key]=latest?.mutation===outgoing.mutation?remote:{...latest,revision:remote.revision};
      commit(next);
     }
     if(current()){status=Object.values(rows).some(x=>x.pending)?'pending':'synced';publish();}
    }catch(error){if(current()){status='offline';publish();}throw error;}
   })();
   running=operation;try{return await operation;}finally{if(current())running=null;}
  },
  removeLocal(identity){
   if(owner===identity){++epoch;owner=null;rows={};sequence=0;running=null;status='locked';publish();}
   storage.removeItem(namespace(identity));
  },
 };
}
