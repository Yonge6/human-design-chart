import {chatAccess,showMembership,initMembership,ensureAIConsent} from './buer-membership.js';
import {renderAssistantText} from './buer-message-format.js';
import {readGrowth,growthContext,answeredCount} from '../services/buer-growth.js';
import {nextQuestionBatch} from './buer-suggestions.js';
import {welcomeForVisit} from './buer-welcome.js';
import {initUsage,trackUsage} from '../services/buer-analytics.js';
import {readBuerEvents,anonymousReport,validChatHistory} from '../services/buer-conversation.js';
import {workspace,workspaceStorage,onWorkspaceChange} from '../services/buer-workspace.js';

const copy={
  zh:{growthHeadline:'建立我的成长档案',growthSteps:'01 认识自己　02 明确行动　03 补充经历',myGrowth:'成长档案',myGrowthHint:'认识 · 行动 · 复盘',nextGrowth:'下一步：HUMAN 3.0 成长访谈',useGrowth:'结合成长档案',growthContextHint:'仅参考你允许的内容',dailyLimit:'今天的 100 条免费对话已用完。明天再聊，或开通会员继续。',followupLabel:'继续聊聊你的想法…',decisionQuestion:'做决定时，怎样听见自己？',energyQuestion:'总觉得累，该怎样找回能量？',strengthQuestion:'怎样发现自己的优势？',boundaryQuestion:'如何温柔地建立边界？',profile:'我的',manualHistory:'说明书历史',chatHistoryHint:'继续上次的探索',tagline:'与真实的自己 · 温柔相遇',home:'见己',manual:'成长档案',history:'对话记录',railFoot:'更认识\n更自在',headline:'今天，想从哪里聊起？',intro:'你的AI成长伙伴豆豆龙',questionLabel:'今天，想从哪里聊起？',workQuestion:'我适合怎样的工作节奏？',relationshipQuestion:'为什么我总在关系里内耗？',aiLabel:'AI 陪你探索',useReport:'结合我的说明书',newChat:'新对话',dataNote:'提问发送至第三方 AI 服务；登录后对话记录同步到你的账号，离线时先保存在本机。',myManual:'我的成长路线',manualIntro:'从人类图开始认识自己，用四领域访谈找到方向，把经历与行动积累成自己的成长档案。',contextFoot:'不是找到一个标准答案，\n而是更清楚地，做自己。',localHistory:'登录后自动同步到同一账号；离线编辑会在联网后同步。',clearChats:'清空对话',clearConfirm:'清空将同步到同一账号的所有设备。确定清空这些对话吗？',cancel:'取消',confirmClear:'确认清空',backHome:'返回对话',backPrevious:'返回上一页',welcome:'先不用急着改变自己。\n从一件最近让你在意的小事开始，我们一起慢慢想明白。',connecting:'正在认真读你的问题…',streaming:'不二见己正在回应…',stopped:'已停止。你可以继续提问，或重新回答。',failed:'连接暂时中断，请稍后重试。',unconfigured:'AI 服务暂未就绪，输入的内容已保留。',rate:'提问有点频繁，稍等一分钟再试。',retry:'重新回答',copy:'复制',copied:'已复制回应',noHistory:'还没有对话。从首页的第一个问题开始。',send:'发送问题',stop:'停止回答',closeHistory:'关闭对话记录',contextHint:'仅参考类型、策略、权威与人生角色，不发送姓名或出生信息。',noStorage:'本机存储不可用，本次对话仅在当前页面保留。'},
  en:{growthHeadline:'Build my growth profile',growthSteps:'01 Know yourself · 02 Find direction · 03 Add your story',myGrowth:'Growth profile',myGrowthHint:'Know · Act · Reflect',nextGrowth:'Next: HUMAN 3.0 reflection',useGrowth:'Use my growth profile',growthContextHint:'Only context you allow',dailyLimit:'Your 100 free messages are used for today. Come back tomorrow or subscribe to continue.',followupLabel:'Share what’s on your mind…',decisionQuestion:'How can I trust my own decisions?',energyQuestion:'How can I restore my energy?',strengthQuestion:'How can I discover my strengths?',boundaryQuestion:'How can I set kinder boundaries?',profile:'Me',manualHistory:'Saved manuals',chatHistoryHint:'Continue your exploration',tagline:'Meet your true self',home:'Home',manual:'Growth',history:'Conversations',railFoot:'Know yourself\nLive freely',headline:'What’s on your mind today?',intro:'Doudoulong, your personal AI growth companion',questionLabel:'What’s on your mind today?',workQuestion:'What work rhythm suits me?',relationshipQuestion:'Why do I overthink relationships?',aiLabel:'Explore with AI',useReport:'Use my Life Manual',newChat:'New conversation',dataNote:'Questions are processed by a third-party AI service. Chat history syncs to your account after sign-in, with an offline copy on this device.',myManual:'My growth path',manualIntro:'Start with Human Design, reflect across four life domains and build a profile from your own experiences and actions.',contextFoot:'Not one perfect answer.\nA clearer sense of being you.',localHistory:'Sign in to sync across devices. Offline edits sync when reconnected.',clearChats:'Clear conversations',clearConfirm:'This clears conversations across devices on this account. Continue?',cancel:'Cancel',confirmClear:'Clear conversations',backHome:'Back to conversation',backPrevious:'Back',welcome:'There is no rush to change yourself.\nStart with something that has been on your mind. We can explore it together.',connecting:'Reading your question…',streaming:'Buer Within is responding…',stopped:'Stopped. Ask another question, or try again.',failed:'The connection was interrupted. Please try again.',unconfigured:'AI is not ready yet. Your question has been kept.',rate:'A few too many questions. Try again in a minute.',retry:'Try again',copy:'Copy',copied:'Response copied',noHistory:'No conversations yet. Start with a question on the home screen.',send:'Send question',stop:'Stop response',closeHistory:'Close conversations',contextHint:'Only type, strategy, authority and profile are sent. No name or birth details.',noStorage:'Device storage is unavailable. This conversation lasts only while this page is open.'},
};
export function initBuerHome({getLanguage,setLanguage,openManual,getReport}) {
  const contentStorage=workspaceStorage();
  let welcomeStorage;try{welcomeStorage=window.localStorage;}catch{}
  const visitWelcome=welcomeForVisit(welcomeStorage);
  const $=s=>document.querySelector(s),t=k=>copy[getLanguage()==='en'?'en':'zh'][k];
  initMembership();
  initUsage();
  const form=$('#buerChatForm'), input=$('#buerQuestion'), messagesEl=$('#buerMessages'), status=$('#buerChatStatus');
  let shownOwner=workspace().owner;
  const draftKey=()=>`buer:chat-draft:${shownOwner||'guest'}`;
  const saveDraft=()=>{try{localStorage.setItem(draftKey(),input.value);}catch{}};
  const restoreDraft=()=>{try{input.value=localStorage.getItem(draftKey())||'';}catch{input.value='';}};
  input.addEventListener('input',saveDraft);restoreDraft();
  const growthPreferenceKey='buer-growth-context-enabled-v1';let growthPreference=true;
  try{const stored=localStorage.getItem(growthPreferenceKey);growthPreference=stored===null||stored==='true';}catch{}
  $('#buerUseGrowth').checked=growthPreference;
  $('#buerUseGrowth').addEventListener('change',()=>{growthPreference=$('#buerUseGrowth').checked;try{localStorage.setItem(growthPreferenceKey,String(growthPreference));}catch{}});
  const syncHeader=()=>$('.topbar').classList.toggle('is-scrolled',window.scrollY>8);
  window.addEventListener('scroll',syncHeader,{passive:true});
  window.addEventListener('pageshow',syncHeader);
  syncHeader();
  // iOS can pan the visual viewport when opening its keyboard. Keep web
  // navigation inside that viewport without interfering with pinch zoom.
  let viewportFrame=0;
  const syncNavigationViewport=()=>{
    cancelAnimationFrame(viewportFrame);
    viewportFrame=requestAnimationFrame(()=>{
      const viewport=window.visualViewport;
      const follow=viewport&&matchMedia('(max-width:760px)').matches&&!document.documentElement.classList.contains('native-text-results')&&Math.abs(viewport.scale-1)<0.01;
      document.documentElement.style.setProperty('--buer-viewport-top',`${follow?Math.max(0,viewport.offsetTop):0}px`);
      document.documentElement.style.setProperty('--buer-viewport-bottom',`${follow?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0}px`);
    });
  };
  window.visualViewport?.addEventListener('resize',syncNavigationViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncNavigationViewport,{passive:true});
  window.addEventListener('resize',syncNavigationViewport,{passive:true});
  window.addEventListener('pageshow',syncNavigationViewport);
  syncNavigationViewport();
  let suggestionState={},suggestions=[];
  try{suggestionState=JSON.parse(localStorage.getItem('buer-suggestion-rotation-v2')||'{}');}catch{}
  function renderSuggestions(){
    const container=$('.buer-suggestions');container.replaceChildren();
    for(const question of suggestions){const b=document.createElement('button');b.type='button';b.dataset.question=String(question.id);b.textContent=question[getLanguage()==='en'?'en':'zh'];const arrow=document.createElement('i');arrow.className='ph ph-arrow-right';arrow.setAttribute('aria-hidden','true');b.append(arrow);b.addEventListener('click',()=>{input.value=b.textContent;input.dispatchEvent(new Event('input'));input.focus({preventScroll:true});});container.append(b);}
    container.scrollLeft=0;
  }
  function rotateSuggestions(){
    const next=nextQuestionBatch(suggestionState);suggestionState=next.state;suggestions=next.questions;
    try{localStorage.setItem('buer-suggestion-rotation-v2',JSON.stringify(suggestionState));}catch{}
    renderSuggestions();
  }
  rotateSuggestions();
  const key='buer-conversations-v1';let threads=[];
  try{threads=validChatHistory(JSON.parse(contentStorage.getItem(key)||'[]'));}catch{}
  let current={id:crypto.randomUUID(),date:Date.now(),messages:[]},controller=null,activeStatus='',reportOverride=null,reportPreference=null;
  const currentReport=()=>reportOverride||anonymousReport(getReport());
  function syncReportSelection(){
    $('#buerUseGrowth').title=getLanguage()==='zh'?'包含我的说明书及已允许参考的成长记录':'Includes my Life Manual and enabled growth records';
  }
  const endpoint=()=>`${(globalThis.PLUTO_CONFIG?.apiBaseUrl||'').replace(/\/$/,'')}/v1/chat`;
  function setStatus(key){activeStatus=key;status.textContent=key?t(key):'';}
  function persist(){
    if(!current.messages.length)return;
    threads=[{...current,date:Date.now()},...threads.filter(thread=>thread.id!==current.id)];
    try{contentStorage.setItem(key,JSON.stringify(threads));}catch{setStatus('noStorage');}
  }
  function button(text,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',handler);return b;}
  function renderMessages(){
    const enteringConversation=current.messages.length && document.body.dataset.conversation!=='active';
    document.body.dataset.conversation=current.messages.length?'active':'empty';
    input.placeholder=t(current.messages.length?'followupLabel':'questionLabel');
    if(enteringConversation && document.body.dataset.workspace==='home') window.scrollTo({top:0,behavior:'instant'});
    const wasNearBottom=messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight<90;
    messagesEl.replaceChildren();
    if(!current.messages.length) return;
    for(const [i,message] of current.messages.entries()) {
      const article=document.createElement('article');article.className=`buer-message ${message.role==='user'?'user':'assistant'}${message.failed?' error':''}`;
      let avatar;
      if(message.role==='assistant'){avatar=document.createElement('img');avatar.src='assets/buer-companion-logo.png';avatar.alt='不二见己 AI';avatar.className='buer-avatar';}
      else {avatar=document.createElement('span');avatar.className='buer-avatar buer-user-avatar';const icon=document.createElement('i');icon.className='ph ph-user';icon.setAttribute('aria-hidden','true');avatar.append(icon);}
      const wrap=document.createElement('div');wrap.className='buer-message-content';const text=document.createElement('p');const content=message.content || t(message.failed?(message.errorKey||'failed'):'connecting');
      if(message.role==='assistant')renderAssistantText(text,content);else text.textContent=content;
      const time=document.createElement('small');time.textContent=new Intl.DateTimeFormat(getLanguage()==='zh'?'zh-CN':'en',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(message.date));wrap.append(text,time);
      if(message.role==='assistant' && !controller){const actions=document.createElement('div');actions.className='buer-message-actions';
        if(message.content) actions.append(button(t('copy'),async()=>{try{await navigator.clipboard.writeText(message.content);setStatus('copied');}catch{setStatus('failed');}}));
        if(message.failed && i===current.messages.length-1)actions.append(button(t('retry'),()=>{current.messages.pop();void ask(null,true);}));
        wrap.append(actions);
      }
      article.append(avatar,wrap);messagesEl.append(article);
    }
    if(wasNearBottom) messagesEl.scrollTop=messagesEl.scrollHeight;
  }
  $('#buerMobileLanguage').addEventListener('click',()=>setLanguage(getLanguage()==='zh'?'en':'zh'));
  function refresh(){
    const languageButton=$('#buerMobileLanguage');
    languageButton.textContent=getLanguage()==='zh'?'EN':'中文';
    languageButton.title=getLanguage()==='zh'?'切换到英文':'Switch to Chinese';
    languageButton.setAttribute('aria-label',languageButton.title);
    document.querySelectorAll('[data-buer]').forEach(el=>{el.textContent=t(el.dataset.buer);});
    $('[data-buer="headline"]').textContent=visitWelcome[getLanguage()==='en'?'en':'zh'];
    input.placeholder=t('questionLabel');$('#buerSend').ariaLabel=t('send');$('#buerStop').ariaLabel=t('stop');$('#buerCloseHistory').ariaLabel=t('closeHistory');
    syncReportSelection();
    const date=new Date();$('#dailyTipDate').textContent=`${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
    $('#dailyTipDateSecondary').textContent=new Intl.DateTimeFormat(getLanguage()==='zh'?'zh-CN':'en',{weekday:'long'}).format(date);
    const growth=readGrowth(workspaceStorage()),count=answeredCount(growth),hasManual=Boolean(getReport()),action=growth.actions.find(x=>!x.done),isZh=getLanguage()==='zh';
    const homeTitle=$('#growthHomeTitle'),homeSteps=$('#growthHomeSteps');
    if(action){homeTitle.textContent=isZh?'回到我的下一步':'Return to my next step';homeSteps.textContent=action.title;}
    else if(hasManual){homeTitle.textContent=isZh?'继续完善成长档案':'Continue my growth profile';homeSteps.textContent=isZh?`认识自己 ✓　HUMAN 3.0 ${count}/12　经历 ${growth.stories.length}`:`Know yourself ✓ · HUMAN 3.0 ${count}/12 · ${growth.stories.length} stories`;}
    const actionEl=$('#growthHomeAction');actionEl.replaceChildren();if(action){const small=document.createElement('small');small.textContent=isZh?'我的下一步':'MY NEXT STEP';const text=document.createElement('p');text.textContent=action.title;const open=document.createElement('button');open.type='button';open.className='growth-button';open.textContent=isZh?'记录进展':'Review progress';open.onclick=()=>void openManual();actionEl.append(small,text,open);}
    setStatus(activeStatus);renderSuggestions();renderMessages();
  }
  function showHome(){document.body.dataset.workspace='home';window.scrollTo({top:0,behavior:'instant'});refresh();}
  document.querySelectorAll('[data-home]').forEach(el=>el.addEventListener('click',showHome));
  document.querySelectorAll('[data-manual]').forEach(el=>el.addEventListener('click',()=>void openManual()));
  new MutationObserver(()=>{document.querySelectorAll('.rail-item').forEach(el=>el.classList.toggle('is-active',el.hasAttribute(`data-${document.body.dataset.workspace==='growth'?'manual':document.body.dataset.workspace}`)));}).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});
  document.addEventListener('buer:language',refresh);
  document.addEventListener('buer:growth-updated',()=>{if(!controller)refresh();});
  document.addEventListener('buer:growth-question',event=>{if(controller)return;input.value=event.detail.question.slice(0,2000);showHome();input.dispatchEvent(new Event('input'));input.focus({preventScroll:true});if(matchMedia('(min-width:761px)').matches)form.scrollIntoView({block:'center',behavior:'smooth'});});
  document.addEventListener('buer:manual-question',event=>{
    if(controller){showHome();return;}
    const {topic,chapter,report}=event.detail;
    reportOverride=anonymousReport(report);
    const zh=getLanguage()==='zh';
    const questions=zh?{work:'结合这份说明书，我可以怎样找到更适合自己的工作节奏？',relationship:'结合这份说明书，我可以怎样在关系中减少内耗、建立边界？',decision:'结合这份说明书，做重要决定前，我可以怎样观察自己的感受？',chapter:`关于“${chapter||''}”这一章，我可以在生活中做什么小尝试？`}:{work:'Using my manual, how can I find a work rhythm that suits me?',relationship:'Using my manual, how can I build boundaries and feel more at ease in relationships?',decision:'Using my manual, what could I notice in myself before an important decision?',chapter:`What small experiment could I try based on the chapter “${chapter||''}”?`};
    const question=questions[topic]||questions.decision;
    input.value=input.value.trim()?`${input.value.trim()}\n\n${question}`:question;
    reportPreference=null;showHome();input.dispatchEvent(new Event('input'));input.focus({preventScroll:true});if(matchMedia('(min-width:761px)').matches)form.scrollIntoView({block:'center',behavior:'smooth'});
  });
  input.addEventListener('focus',syncReportSelection);
  input.addEventListener('keydown',event=>{if(event.key==='Enter' && !event.shiftKey && !event.isComposing){event.preventDefault();form.requestSubmit();}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,160)}px`;});
  function setBusy(busy){$('#buerSend').hidden=busy;$('#buerStop').hidden=!busy;$('#buerNewChat').disabled=busy;input.disabled=busy;document.querySelectorAll('[data-question]').forEach(b=>b.disabled=busy);$('#buerUseGrowth').disabled=busy;}
  async function ask(question,retry=false){
    const ticket=workspace().epoch;
    if(controller)return;
    if(!await ensureAIConsent()||ticket!==workspace().epoch)return;
    if(controller)return;
    const value=(question??input.value).trim();if(!retry && !value)return;
    if(!retry){current.messages.push({role:'user',content:value,date:Date.now()});input.value='';saveDraft();input.style.height='';}
    const history=current.messages.filter(message=>!message.failed && message.content).slice(-12).map(({role,content})=>({role,content:content.slice(0,4000)}));
    while(history.reduce((n,m)=>n+m.content.length,0)>14000 && history.length>1)history.shift();
    const answer={role:'assistant',content:'',date:Date.now()};current.messages.push(answer);
    persist();
    const active=new AbortController();controller=active;setBusy(true);setStatus('connecting');renderMessages();
    const timeout=setTimeout(()=>active.abort('timeout'),110000);
    const started=performance.now();trackUsage('chat_request');
    try {
      if(globalThis.PLUTO_CONFIG?.buerChatEnabled===false)throw new Error('AI_NOT_CONFIGURED');
      const report=$('#buerUseGrowth').checked?currentReport():null;
      const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,...(report?{report}:{}),...($('#buerUseGrowth').checked?{growth:growthContext(readGrowth(workspaceStorage()),value)}:{}),...await chatAccess()}),signal:active.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error || 'AI_UNAVAILABLE');}
      if(!response.body)throw new Error('AI_UNAVAILABLE');
      await readBuerEvents(response.body,(type,data)=>{if(ticket===workspace().epoch&&type==='delta'){answer.content+=data.text;setStatus('streaming');renderMessages();}});
      if(ticket!==workspace().epoch)return;
      setStatus('');
      trackUsage('chat_success');trackUsage('chat_latency',{value:(performance.now()-started)/1000});
    } catch(error) {
      if(ticket!==workspace().epoch)return;
      trackUsage(active.signal.aborted&&active.signal.reason!=='timeout'?'chat_cancel':'chat_error');
      if(error.message==='DAILY_LIMIT'){showMembership();}
      answer.failed=true;
      if(active.signal.aborted && active.signal.reason!=='timeout')setStatus('stopped');
      else setStatus(error.message==='DAILY_LIMIT'?'dailyLimit':error.message==='AI_NOT_CONFIGURED'?'unconfigured':error.message==='RATE_LIMITED'?'rate':'failed');
      answer.errorKey=activeStatus;
    } finally {clearTimeout(timeout);if(ticket===workspace().epoch){controller=null;setBusy(false);persist();renderMessages();if(matchMedia('(min-width:761px)').matches)input.focus({preventScroll:true});}}
  }
  form.addEventListener('submit',event=>{event.preventDefault();void ask(input.value);});
  $('#buerStop').addEventListener('click',()=>controller?.abort());
  $('#buerNewChat').addEventListener('click',()=>{if(controller)return;persist();current={id:crypto.randomUUID(),date:Date.now(),messages:[]};input.value='';reportOverride=null;reportPreference=null;rotateSuggestions();syncReportSelection();setStatus('');renderMessages();if(matchMedia('(min-width:761px)').matches)input.focus({preventScroll:true});});
  function renderHistory(){const list=$('#buerHistoryList');list.replaceChildren();if(!threads.length){const p=document.createElement('p');p.textContent=t('noHistory');list.append(p);return;}
    for(const thread of threads){const first=thread.messages.find(m=>m.role==='user')?.content||t('newChat');const b=button(first.slice(0,80),()=>{if(controller)return;persist();current=structuredClone(thread);reportOverride=null;reportPreference=null;syncReportSelection();setStatus('');$('#buerHistory').close();showHome();});const small=document.createElement('small');small.textContent=new Intl.DateTimeFormat(getLanguage()==='zh'?'zh-CN':'en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(thread.date));b.append(small);list.append(b);}
  }
  $('#buerHistoryButton').addEventListener('click',()=>{if(controller){setStatus('streaming');return;}persist();renderHistory();$('#buerClearConfirm').hidden=true;$('#buerHistory').showModal();});
  $('#buerCloseHistory').addEventListener('click',()=>$('#buerHistory').close());
  $('#buerClearChats').addEventListener('click',()=>{$('#buerClearConfirm').hidden=false;});
  $('#buerCancelClear').addEventListener('click',()=>{$('#buerClearConfirm').hidden=true;});
  $('#buerConfirmClear').addEventListener('click',()=>{try{contentStorage.removeItem(key);}catch{setStatus('noStorage');return;}threads=[];current={id:crypto.randomUUID(),date:Date.now(),messages:[]};$('#buerClearConfirm').hidden=true;renderHistory();renderMessages();});
  onWorkspaceChange(({reason})=>{
    if(reason==='identity'){
      saveDraft();shownOwner=workspace().owner;
      controller?.abort();controller=null;current={id:crypto.randomUUID(),date:Date.now(),messages:[]};input.value='';reportOverride=null;reportPreference=null;setBusy(false);setStatus('');$('#buerHistory').close();
      restoreDraft();
    }
    if(reason!=='write'&&!controller){threads=validChatHistory(JSON.parse(contentStorage.getItem(key)||'[]'));if(current.messages.length)current=structuredClone(threads.find(x=>x.id===current.id)||{id:crypto.randomUUID(),date:Date.now(),messages:[]});renderHistory();renderMessages();refresh();}
  });
  refresh();
  document.body.removeAttribute('data-app-pending');
  document.querySelector('#workspaceBootPreviews')?.setAttribute('aria-busy','false');
  document.dispatchEvent(new Event('buer:home-ready'));
}
