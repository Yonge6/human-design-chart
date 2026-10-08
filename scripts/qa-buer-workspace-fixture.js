// Synthetic, local-browser-only fixture. No production credentials or AI calls.
export async function installWorkspaceFixture(){
 if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('LOCAL_QA_ONLY');
 const {workspace,workspaceStorage}=await import('../src/services/buer-workspace.js');
 const {initBuerJournal}=await import('../src/app/buer-journal.js');
 const {initBuerRelationships}=await import('../src/app/buer-relationships.js');
 const {calculateHumanDesign}=await import('../human-design-engine.js');
 const {createHumanDesignProfileSnapshot}=await import('../src/engine/profile-snapshot.js');
 const {makeGuideSource}=await import('../src/services/buer-pair-manual.js');
 const {stampGuide}=await import('../src/services/buer-pair-guidance.js');
 const id='b2601008-0000-4000-8000-000000000001',personId='b2601008-0000-4000-8000-000000000002';
 const me=await calculateHumanDesign({name:'示例甲',location:'上海',year:1990,month:1,day:1,hour:8,minute:0,timezone:'Asia/Shanghai'});
 const them=await calculateHumanDesign({name:'示例乙',location:'上海',year:1991,month:2,day:2,hour:9,minute:0,timezone:'Asia/Shanghai'});
 const chart=await createHumanDesignProfileSnapshot({input:{birthDate:'1991-02-02',birthTime:'09:00',timezone:'Asia/Shanghai',locationLabel:'上海'},result:them});
 const person={id:personId,user_id:id,revision:1,nickname:'示例朋友',relationship:'朋友',source:'entered',birth:{certainty:'known',date:'1991-02-02',time:'09:00',timezone:'Asia/Shanghai',location:'上海'},chart,notes:'',updated_at:new Date().toISOString()};
 const growth={version:2,answers:{q1:'示例回答'},stories:[{id:'qa-story',title:'示例经历',body:'这是一条合成测试记录。',useAI:false,date:new Date().toISOString()}],actions:[]};
 const source={user_id:id,payload:makeGuideSource(me,growth),revision:1,updated_at:new Date().toISOString()};
 const sections=stampGuide(Object.fromEntries(['overview','communication','friction','rhythm','repair','practice'].map(k=>[k,'**一起试试：**\n这是一段合成测试解读，不是用户的真实资料。\n\n**为什么这样建议：**\n依据是测试资料，用来检查折叠与排版。'])));
 const guide={user_id:id,person_id:personId,revision:1,person_revision:1,source_revision:1,sections,updated_at:new Date().toISOString()};
 const records=new Map(),listeners=[];let offline=false;
 const account={user:{id,email:'qa@example.invalid'},config:{providers:[],apiUrl:'https://example.invalid'},subscribe(fn){listeners.push(fn);fn(this.user);},switch(id){this.user=id?{id,email:'qa@example.invalid'}:null;listeners.forEach(fn=>fn(this.user));},async signOut(){this.switch(null);},client:{
  from(table){const filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},is(){return q;},order(){return q;},limit(){return q;},range(){return q;},then(resolve,reject){if(offline)return Promise.reject(Error('offline')).then(resolve,reject);const data=table==='buer_workspace_records'?[...records.values()]:table==='buer_people'?[person]:table==='buer_guide_sources'?[source]:table==='buer_pair_manuals'?[guide]:[];return Promise.resolve({data:structuredClone(data.filter(r=>filters.every(([k,v])=>r[k]===v))),error:null}).then(resolve,reject);}};return q;},
  async rpc(name,args){if(offline)throw Error('offline');if(name!=='buer_save_workspace_record')throw Error('UNEXPECTED_QA_WRITE');const key=account.user.id+':'+args.record_kind+':'+args.record_key,old=records.get(key);if(old?.mutation_id===args.mutation)return {data:old};if((old?.revision||0)!==args.expected_revision)return {error:{code:'40001'}};const row={user_id:account.user.id,kind:args.record_kind,record_id:args.record_key,revision:(old?.revision||0)+1,mutation_id:args.mutation,payload:args.record_payload,deleted:args.is_deleted};records.set(key,structuredClone(row));return {data:structuredClone(row)};},auth:{async getSession(){return {data:{session:null}};}}
 }};
 const journal=await initBuerJournal({getLanguage:()=> 'zh',accountFactory:async()=>account});
 await workspace().activate(id);await workspace().sync();
 const s=workspaceStorage();s.getItem('buer-conversations-v1');s.setItem('buer-conversations-v1',JSON.stringify([{id:'qa-chat',date:Date.now(),messages:[{role:'user',content:'账号甲的示例对话',date:Date.now()}]}]));
 s.getItem('buer-growth-profile-v1');s.setItem('buer-growth-profile-v1',JSON.stringify(growth));
 s.getItem('pluto-chart-history-v1');s.setItem('pluto-chart-history-v1',JSON.stringify([{id:'qa-manual',createdAt:Date.now(),data:me,input:{name:'示例甲'}}]));await workspace().sync();
 document.querySelector('#buerPeople')?.remove();document.querySelector('[data-people]')?.remove();document.querySelector('.relationship-dialog')?.remove();
 const people=initBuerRelationships({getLanguage:()=> 'zh',account,getGrowthReport:()=>me,openAccount:()=>journal.open('account')});
 window.buerQA={account,journal,people,workspace:workspace(),records,offline:value=>{offline=value;}};
 return {owner:workspace().owner,counts:{chats:workspace().values().chats.length,stories:workspace().values().growth.stories.length,manuals:workspace().values().manuals.length}};
}
