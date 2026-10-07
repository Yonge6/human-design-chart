export const SCOPE_KEYS = ['chart','growth','journal','history'];
// A new relationship chat offers all account-owned sources. Persist only on send;
// never override an existing user's explicit scope choices or import local data.
export function relationshipScopeDefaults(personal) {
 return personal ? cleanPersonalContext(personal.payload).scopes : Object.fromEntries(SCOPE_KEYS.map(k=>[k,true]));
}
export const RELATION_TYPES = [['父母','Parents'],['恋人','Partner'],['夫妻','Spouse'],['子女','Children'],['同事','Colleagues'],['合作伙伴','Collaborators'],['朋友','Friends'],['其他','Other']];
const str=(v,n)=>{if(v==null)return '';if(typeof v!=='string')throw Error('INVALID_CONTEXT');return v.slice(0,n);};
export function cleanPersonalContext(value={}) {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_CONTEXT');
 const scopes=Object.fromEntries(SCOPE_KEYS.map(k=>[k,value.scopes?.[k]===true]));
 let chart=null;
 if(value.chart){chart={};for(const k of ['Type','Strategy','Inner Authority','Profile','Definition','Incarnation Cross'])if(value.chart[k]!=null)chart[k]=str(value.chart[k],180);}
 const rows=(key,max)=>{if(value[key]!=null&&!Array.isArray(value[key]))throw Error('INVALID_CONTEXT');return (value[key]||[]).slice(0,max).map(x=>{if(!x||typeof x!=='object')throw Error('INVALID_CONTEXT');return {id:str(x.id,80),title:str(x.title,100),body:str(x.body,4000),date:str(x.date,40)};});};
 const clean={version:2,scopes,chart,answers:rows('answers',12),stories:rows('stories',100),actions:rows('actions',100),chats:rows('chats',20)};
 if(JSON.stringify(clean).length>220000)throw Error('CONTEXT_TOO_LARGE');return clean;
}
export function rankExcerpts(rows,query,limit=5,length=1600){
 const lower=String(query).toLowerCase(),tokens=[...new Set(lower.match(/[a-z]{3,}|[\u4e00-\u9fff]{2}/g)||[])];
 return rows.map((row,index)=>{const body=String(row.body||''),title=String(row.title||'');return {row,index,score:tokens.reduce((n,t)=>n+Number((title+body).toLowerCase().includes(t)),0)};})
  .filter(x=>x.row.body?.trim()).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).map(({row})=>({id:str(row.id,80),title:str(row.title,100),body:str(row.body,length),date:str(row.date,40),kind:row.kind||'reference'}));
}
export function selectPersonalContext(value,query,requested){
 const v=cleanPersonalContext(value);const scopes=Object.fromEntries(SCOPE_KEYS.map(k=>[k,v.scopes[k]&&requested?.[k]===true]));
 const rows=[];if(scopes.growth)for(const key of ['answers','stories','actions'])rows.push(...v[key].map(x=>({...x,kind:key})));
 if(scopes.history)rows.push(...v.chats.map(x=>({...x,kind:'history'})));
 return {scopes,chart:scopes.chart?v.chart:null,excerpts:rankExcerpts(rows,query,8,1600)};
}
