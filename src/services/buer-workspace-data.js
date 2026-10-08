import {validateWorkspaceValue} from './buer-workspace-sync.js';

export const LEGACY_WORKSPACE_KEYS=['buer-conversations-v1','buer-growth-profile-v1','pluto-chart-history-v1'];
export const LEGACY_OWNER_KEY='buer:workspace:legacy-owner:v1';
export function workspaceRecords({chats=[],growth={},manuals=[]}={}){
 if(!Array.isArray(chats)||!Array.isArray(manuals)||!growth||typeof growth!=='object'||Array.isArray(growth))throw Error('INVALID_LEGACY_WORKSPACE');
 const rows=[],keys=new Set();
 const add=(kind,id,payload)=>{
  validateWorkspaceValue(kind,id,payload);const key=JSON.stringify([kind,id]);
  if(keys.has(key))throw Error('DUPLICATE_WORKSPACE_ID');keys.add(key);rows.push({kind,id,payload:structuredClone(payload)});
 };
 for(const chat of chats){if(!Array.isArray(chat?.messages))throw Error('INVALID_LEGACY_WORKSPACE');add('chat',chat.id,chat);}
 for(const manual of manuals){if(!manual?.data?.Properties||!manual.data.Meta)throw Error('INVALID_LEGACY_WORKSPACE');add('manual',manual.id,manual);}
 if(growth.answers){if(typeof growth.answers!=='object'||Array.isArray(growth.answers))throw Error('INVALID_LEGACY_WORKSPACE');for(const [id,value] of Object.entries(growth.answers))add('answer',id,{value});}
 for(const [property,kind] of [['stories','story'],['actions','action']]){
  if(growth[property]!==undefined&&!Array.isArray(growth[property]))throw Error('INVALID_LEGACY_WORKSPACE');
  for(const value of growth[property]||[])add(kind,value?.id,value);
 }
 if(growth.report!==undefined||growth.reportDate!==undefined)add('growth_meta','report',{report:growth.report||'',reportDate:growth.reportDate||''});
 // Preserve unknown growth metadata as data, never collect arbitrary browser keys.
 for(const [id,value] of Object.entries(growth))if(!['answers','stories','actions','report','reportDate'].includes(id))add('growth_meta',id,{value});
 return rows;
}
export function workspaceValues(records){
 const chats=[],manuals=[],growth={version:2,answers:{},stories:[],actions:[]},conflicts=[];
 for(const row of records){
  if(row.deleted)continue;validateWorkspaceValue(row.kind,row.id,row.payload);
  const value=structuredClone(row.payload);
  if(row.kind==='chat')chats.push(value);
  else if(row.kind==='manual')manuals.push(value);
  else if(row.kind==='story')growth.stories.push(value);
  else if(row.kind==='action')growth.actions.push(value);
  else if(row.kind==='answer')Object.defineProperty(growth.answers,row.id,{value:value.value,enumerable:true,writable:true,configurable:true});
  else if(row.kind==='growth_meta'){
   if(row.id==='report'){growth.report=value.report;growth.reportDate=value.reportDate;}
   else if(!['answers','stories','actions','reportDate','__proto__','constructor','prototype'].includes(row.id))Object.defineProperty(growth,row.id,{value:value.value,enumerable:true,writable:true,configurable:true});
  }else if(row.kind==='conflict')conflicts.push({...value,recordId:value.id,id:row.id});
 }
 chats.sort((a,b)=>Number(b.date)-Number(a.date));manuals.sort((a,b)=>Number(b.createdAt)-Number(a.createdAt));
 growth.stories.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 return {chats,growth,manuals,conflicts};
}

export function migrateLegacyWorkspace({storage,sync}){
 const owner=sync.owner;if(!owner)throw Error('SIGN_IN_REQUIRED');
 const claimed=storage.getItem(LEGACY_OWNER_KEY);
 if(claimed)return {imported:0,claimedOwner:claimed};
 const raw=LEGACY_WORKSPACE_KEYS.map(key=>storage.getItem(key));
 const values=raw.map((value,i)=>{try{return value===null?(i===1?{}:[]):JSON.parse(value);}catch{throw Error('INVALID_LEGACY_WORKSPACE');}});
 const records=workspaceRecords({chats:values[0],growth:values[1],manuals:values[2]});
 // import() must durably save before ownership is claimed or originals removed.
 sync.import(records);
 storage.setItem(LEGACY_OWNER_KEY,owner);
 let cleanupPending=false;
 for(const key of LEGACY_WORKSPACE_KEYS){try{storage.removeItem(key);}catch{cleanupPending=true;}}
 return {imported:records.length,claimedOwner:owner,cleanupPending};
}
