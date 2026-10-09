import { UUID, anonymousPerson } from '../src/services/buer-relationships.js';
import { SCOPE_KEYS, cleanPersonalContext, selectPersonalContext, rankExcerpts } from '../src/services/buer-personal-context.js';
import { cleanGuideSource } from '../src/services/buer-pair-manual.js';

export async function loadPairManualContext(selected,authorization,{environment=process.env,fetchImpl=fetch}={}){
 if(!selected||Object.keys(selected).some(k=>!['personId','personRevision','sourceRevision'].includes(k))||!UUID.test(selected.personId)||!Number.isInteger(selected.personRevision)||selected.personRevision<1||!Number.isInteger(selected.sourceRevision)||selected.sourceRevision<1)throw Error('INVALID_INPUT');
 if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization))throw Error('SIGN_IN_REQUIRED');
 const url=environment.BUER_ACCOUNT_URL,key=environment.BUER_ACCOUNT_PUBLISHABLE_KEY;
 if(!url||!key||new URL(url).protocol!=='https:')throw Error('ACCOUNT_NOT_CONFIGURED');
 const get=async path=>{const r=await fetchImpl(`${url.replace(/\/$/,'')}${path}`,{headers:{apikey:key,Authorization:authorization},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(r.status===401||r.status===403?'SIGN_IN_REQUIRED':'ACCOUNT_UNAVAILABLE');return r.json();};
 const user=await get('/auth/v1/user');if(!UUID.test(user.id))throw Error('SIGN_IN_REQUIRED');
 const people=await get(`/rest/v1/buer_people?select=id,user_id,is_self,birth,chart,relationship,revision&deleted_at=is.null&id=eq.${selected.personId}`);
 const person=people.find(p=>p.id===selected.personId&&p.user_id===user.id&&!p.is_self);
 const rows=await get(`/rest/v1/buer_guide_sources?select=user_id,payload,revision&user_id=eq.${user.id}&limit=1`);
 const source=rows.find(s=>s.user_id===user.id);
 if(!person||person.revision!==selected.personRevision||!source||source.revision!==selected.sourceRevision)throw Error('PROFILES_CHANGED');
 const clean=cleanGuideSource(source.payload),other=anonymousPerson(person);
 if(other.chart){other.chart={...other.chart,activations:person.chart.activations,structure:person.chart.structure};}
 const historyRows=await get(`/rest/v1/buer_relationship_conversations?select=id,user_id,person_id,messages,updated_at&user_id=eq.${user.id}&person_id=eq.${selected.personId}&order=updated_at.desc&limit=30`);
 const relationshipHistory=rankExcerpts(historyRows.filter(x=>x.user_id===user.id&&x.person_id===selected.personId).map(row=>({id:row.id,title:'与这个人的过往关系对话',date:row.updated_at,kind:'relationship-history',body:(Array.isArray(row.messages)?row.messages:[]).filter(message=>message&&['user','assistant'].includes(message.role)&&typeof message.content==='string').map(message=>`${message.role}: ${message.content}`).join('\n')})),'沟通 决策 节奏 分歧 修复 相处 支持',8,2400);
 const context={me:clean,other,relationship:String(person.relationship||'').slice(0,60),relationshipHistory,coverage:'All canonical growth answers, experiences, actions/reflections and growth report in the explicitly confirmed source snapshot, plus bounded prior relationship conversations with this person. No journals or private person notes.',sources:[{kind:'growth-snapshot',title:'成长档案全部记录',id:String(source.revision)},...relationshipHistory.map(({id,title,date,kind})=>({id,title,date,kind}))]};
 if(JSON.stringify(context).length>160000)throw Error('GUIDE_SOURCE_TOO_LARGE');
 return context;
}

export function validateRelationshipSelection(value) {
  if(value?.version===2){
    if(Object.keys(value).some(k=>!['version','personId','personRevision','contextRevision','scopes'].includes(k))||!UUID.test(value.personId)||!Number.isInteger(value.personRevision)||value.personRevision<1||!Number.isInteger(value.contextRevision)||value.contextRevision<0||!value.scopes||typeof value.scopes!=='object'||Array.isArray(value.scopes)||Object.keys(value.scopes).some(k=>!SCOPE_KEYS.includes(k))||SCOPE_KEYS.some(k=>typeof value.scopes[k]!=='boolean'))throw Error('INVALID_INPUT');
    return value;
  }
  if (!value || typeof value !== 'object' || Object.keys(value).some(k => !['selfId','personId','selfRevision','personRevision','journal'].includes(k)) ||
    !UUID.test(value.selfId) || !UUID.test(value.personId) || value.selfId === value.personId ||
    !Number.isInteger(value.selfRevision) || value.selfRevision < 1 || !Number.isInteger(value.personRevision) || value.personRevision < 1) throw Error('INVALID_INPUT');
  const journal = value.journal || [];
  if (!Array.isArray(journal) || journal.length > 2 || new Set(journal.map(x => x?.id)).size !== journal.length) throw Error('INVALID_INPUT');
  for (const item of journal) if (!item || Object.keys(item).some(k => !['id','excerpt'].includes(k)) || !UUID.test(item.id) ||
    typeof item.excerpt !== 'string' || !item.excerpt.trim() || item.excerpt.length > 1200) throw Error('INVALID_INPUT');
  return { ...value, journal };
}

export async function loadRelationshipContext(value, authorization, { environment = process.env, fetchImpl = fetch, query = '' } = {}) {
  const selected = validateRelationshipSelection(value);
  if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)) throw Error('SIGN_IN_REQUIRED');
  const url = environment.BUER_ACCOUNT_URL, key = environment.BUER_ACCOUNT_PUBLISHABLE_KEY;
  if (!url || !key || new URL(url).protocol !== 'https:') throw Error('ACCOUNT_NOT_CONFIGURED');
  const headers = { apikey: key, Authorization: authorization };
  const get = async path => {
    const response = await fetchImpl(`${url.replace(/\/$/, '')}${path}`, { headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'SIGN_IN_REQUIRED' : 'ACCOUNT_UNAVAILABLE');
    return response.json();
  };
  const user = await get('/auth/v1/user');
  if (!UUID.test(user.id)) throw Error('SIGN_IN_REQUIRED');
  if(selected.version===2){
    const rows=await get(`/rest/v1/buer_people?select=id,user_id,is_self,source,birth,chart,revision,relationship&deleted_at=is.null&id=eq.${selected.personId}`);
    const other=rows.find(x=>x.id===selected.personId&&x.user_id===user.id&&!x.is_self);
    if(!other||other.revision!==selected.personRevision)throw Error('PROFILES_CHANGED');
    const settings=await get(`/rest/v1/buer_personal_context?select=user_id,payload,revision&user_id=eq.${user.id}&limit=1`);
    const own=settings.find(x=>x.user_id===user.id);
    if((own?.revision||0)!==selected.contextRevision)throw Error('PROFILES_CHANGED');
    const personal=selectPersonalContext(own?.payload||{},query,selected.scopes);
    const references=[...personal.excerpts];
    let journalScanned=0;
    if(personal.scopes.journal){
      let best=[];
      for(let offset=0;offset<1000;offset+=100){
        const page=await get(`/rest/v1/buer_journal_entries?select=id,user_id,title,body,entry_date&user_id=eq.${user.id}&deleted_at=is.null&order=entry_date.desc,id.asc&limit=100&offset=${offset}`);
        const owned=page.filter(x=>x.user_id===user.id);journalScanned+=owned.length;
        best=rankExcerpts([...best,...owned.map(x=>({id:x.id,title:x.title,body:x.body,date:x.entry_date,kind:'journal'}))],query,5,1800);
        if(page.length<100)break;
      }
      references.push(...best);
    }
    if(personal.scopes.history&&SCOPE_KEYS.every(k=>personal.scopes[k]===cleanPersonalContext(own?.payload||{}).scopes[k])){
      // Never pull another person's relationship conversation into this pair.
      const rows=await get(`/rest/v1/buer_relationship_conversations?select=id,user_id,person_id,context_revision,messages,updated_at&user_id=eq.${user.id}&person_id=eq.${selected.personId}&context_revision=eq.${selected.contextRevision}&order=updated_at.desc&limit=30`);
      references.push(...rankExcerpts(rows.filter(x=>x.user_id===user.id&&x.person_id===selected.personId&&x.context_revision===selected.contextRevision).map(x=>({id:x.id,title:'我们之前的对话',date:x.updated_at,body:x.messages.map(m=>`${m.role}: ${m.content}`).join('\n'),kind:'relationship-history'})),query,3,1800));
    }
    return {me:{chart:personal.chart},other:anonymousPerson(other),relationship:String(other.relationship||'').slice(0,60),personalReferences:references,
      sources:references.map(({id,title,date,kind})=>({id,title,date,kind})),scopes:personal.scopes,journalScanned,
      limitations:'Bounded relevant excerpts: imported personal snapshot; newest 1000 journals and 30 conversations with this person. Not a complete life history.'};
  }
  // Forward the caller's token, never a service key: RLS also enforces this selection.
  const rows = await get(`/rest/v1/buer_people?select=id,user_id,is_self,source,birth,chart,revision&deleted_at=is.null&id=in.(${selected.selfId},${selected.personId})`);
  const own = rows.find(x => x.id === selected.selfId && x.user_id === user.id && x.is_self);
  const other = rows.find(x => x.id === selected.personId && x.user_id === user.id && !x.is_self);
  if (!own || !other || own.revision !== selected.selfRevision || other.revision !== selected.personRevision) throw Error('PROFILES_CHANGED');
  const journal = [];
  for (const item of selected.journal) {
    const entries = await get(`/rest/v1/buer_journal_entries?select=id,user_id,body&deleted_at=is.null&id=eq.${item.id}`);
    if (entries.length !== 1 || entries[0].user_id !== user.id || !entries[0].body.includes(item.excerpt)) throw Error('JOURNAL_CHANGED');
    journal.push(item.excerpt);
  }
  return { me: anonymousPerson(own), other: anonymousPerson(other), selectedJournalExcerpts: journal };
}
