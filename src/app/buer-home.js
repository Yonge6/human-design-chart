import {readBuerEvents,anonymousReport,validChatHistory} from '../services/buer-conversation.js';

const copy={
  zh:{profile:'我的',manualHistory:'说明书历史',chatHistoryHint:'继续上次的探索',tagline:'与真实的自己 · 温柔相遇',home:'首页',manual:'人生说明书',history:'对话记录',railFoot:'更认识\n更自在',headline:'从一个问题，靠近自己',intro:'在这里，任何关于你的问题，都值得被认真对待',questionLabel:'此刻，你想更了解自己的哪一面？',workQuestion:'我适合怎样的工作节奏？',relationshipQuestion:'为什么我总在关系里内耗？',aiLabel:'AI 陪你探索',useReport:'结合我的说明书',newChat:'新对话',dataNote:'提问发送至 DeepSeek 处理；对话记录仅保存在本机。',myManual:'我的人生说明书',manualIntro:'一份专属于你的说明书，帮你更了解自己的倾向、节奏与选择。',contextFoot:'不是找到一个标准答案，\n而是更清楚地，做自己。',localHistory:'只保存在当前设备，不会同步到其他设备。',clearChats:'清空本机对话',clearConfirm:'清空后无法恢复这些对话。确定清空吗？',cancel:'取消',confirmClear:'确认清空',backHome:'返回对话',welcome:'先不用急着改变自己。\n从一件最近让你在意的小事开始，我们一起慢慢想明白。',connecting:'正在认真读你的问题…',streaming:'不二见己正在回应…',stopped:'已停止。你可以继续提问，或重新回答。',failed:'连接暂时中断，请稍后重试。',unconfigured:'AI 服务暂未就绪，输入的内容已保留。',rate:'提问有点频繁，稍等一分钟再试。',retry:'重新回答',copy:'复制',copied:'已复制回应',noHistory:'还没有对话。从首页的第一个问题开始。',send:'发送问题',stop:'停止回答',closeHistory:'关闭对话记录',contextHint:'仅参考类型、策略、权威与人生角色，不发送姓名或出生信息。',noStorage:'本机存储不可用，本次对话仅在当前页面保留。'},
  en:{profile:'Me',manualHistory:'Saved manuals',chatHistoryHint:'Continue your exploration',tagline:'Meet your true self',home:'Home',manual:'Life Manual',history:'Conversations',railFoot:'Know yourself\nLive freely',headline:'One question. Closer to yourself',intro:'Every question about you deserves to be heard',questionLabel:'What would you like to understand about yourself?',workQuestion:'What work rhythm suits me?',relationshipQuestion:'Why do I overthink relationships?',aiLabel:'Explore with AI',useReport:'Use my Life Manual',newChat:'New conversation',dataNote:'Questions are processed by DeepSeek. Chat history stays on this device.',myManual:'My Life Manual',manualIntro:'A personal guide to your tendencies, your rhythm, and the choices ahead.',contextFoot:'Not one perfect answer.\nA clearer sense of being you.',localHistory:'Saved only on this device, without cross-device sync.',clearChats:'Clear local conversations',clearConfirm:'This cannot be undone. Clear these conversations?',cancel:'Cancel',confirmClear:'Clear conversations',backHome:'Back to conversation',welcome:'There is no rush to change yourself.\nStart with something that has been on your mind. We can explore it together.',connecting:'Reading your question…',streaming:'Buer Within is responding…',stopped:'Stopped. Ask another question, or try again.',failed:'The connection was interrupted. Please try again.',unconfigured:'AI is not ready yet. Your question has been kept.',rate:'A few too many questions. Try again in a minute.',retry:'Try again',copy:'Copy',copied:'Response copied',noHistory:'No conversations yet. Start with a question on the home screen.',send:'Send question',stop:'Stop response',closeHistory:'Close conversations',contextHint:'Only type, strategy, authority and profile are sent. No name or birth details.',noStorage:'Device storage is unavailable. This conversation lasts only while this page is open.'},
};
export function initBuerHome({getLanguage,openManual,getReport}) {
  const $=s=>document.querySelector(s),t=k=>copy[getLanguage()==='en'?'en':'zh'][k];
  const form=$('#buerChatForm'), input=$('#buerQuestion'), messagesEl=$('#buerMessages'), status=$('#buerChatStatus');
  const key='buer-conversations-v1';let threads=[];
  try{threads=validChatHistory(JSON.parse(localStorage.getItem(key)||'[]'));}catch{}
  let current={id:crypto.randomUUID(),date:Date.now(),messages:[]},controller=null,activeStatus='',reportOverride=null;
  const currentReport=()=>reportOverride||anonymousReport(getReport());
  const endpoint=()=>`${(globalThis.PLUTO_CONFIG?.apiBaseUrl||'').replace(/\/$/,'')}/v1/chat`;
  function setStatus(key){activeStatus=key;status.textContent=key?t(key):'';}
  function persist(){
    if(!current.messages.length)return;
    threads=[{...current,date:Date.now()},...threads.filter(thread=>thread.id!==current.id)].slice(0,20);
    try{localStorage.setItem(key,JSON.stringify(threads));}catch{setStatus('noStorage');}
  }
  function button(text,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',handler);return b;}
  function renderMessages(){
    document.body.dataset.conversation=current.messages.length?'active':'empty';
    const wasNearBottom=messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight<90;
    messagesEl.replaceChildren();
    if(!current.messages.length){const empty=document.createElement('div');empty.className='buer-empty';const img=document.createElement('img');img.src='assets/buer-ai-orb.webp';img.alt='';const p=document.createElement('p');p.textContent=t('welcome');p.style.whiteSpace='pre-line';empty.append(img,p);messagesEl.append(empty);return;}
    for(const [i,message] of current.messages.entries()) {
      const article=document.createElement('article');article.className=`buer-message ${message.role==='user'?'user':'assistant'}${message.failed?' error':''}`;
      let avatar;
      if(message.role==='assistant'){avatar=document.createElement('img');avatar.src='assets/buer-ai-orb.webp';avatar.alt='不二见己 AI';avatar.className='buer-avatar';}
      else {avatar=document.createElement('span');avatar.className='buer-avatar buer-user-avatar';const icon=document.createElement('i');icon.className='ph ph-user';icon.setAttribute('aria-hidden','true');avatar.append(icon);}
      const wrap=document.createElement('div');wrap.className='buer-message-content';const text=document.createElement('p');text.textContent=message.content || t(message.failed?(message.errorKey||'failed'):'connecting');
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
  $('#buerMobileLanguage').addEventListener('click',()=>{document.querySelector(`[data-language="${getLanguage()==='zh'?'en':'zh'}"]`).click();});
  function refresh(){
    const languageButton=$('#buerMobileLanguage');
    languageButton.textContent=getLanguage()==='zh'?'EN':'中文';
    languageButton.title=getLanguage()==='zh'?'切换到英文':'Switch to Chinese';
    languageButton.setAttribute('aria-label',languageButton.title);
    document.querySelectorAll('[data-buer]').forEach(el=>{el.textContent=t(el.dataset.buer);});
    input.placeholder=t('questionLabel');$('#buerSend').ariaLabel=t('send');$('#buerStop').ariaLabel=t('stop');$('#buerCloseHistory').ariaLabel=t('closeHistory');
    $('#buerContextLabel').hidden=!currentReport();$('#buerContextLabel').title=t('contextHint');
    const date=new Date();$('#dailyTipDate').textContent=`${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
    $('#dailyTipDateSecondary').textContent=new Intl.DateTimeFormat(getLanguage()==='zh'?'zh-CN':'en',{weekday:'long'}).format(date);
    setStatus(activeStatus);renderMessages();
  }
  function showHome(){document.body.dataset.workspace='home';window.scrollTo({top:0,behavior:'instant'});refresh();}
  document.querySelectorAll('[data-home]').forEach(el=>el.addEventListener('click',showHome));
  document.querySelectorAll('[data-manual]').forEach(el=>el.addEventListener('click',()=>void openManual()));
  new MutationObserver(()=>{document.querySelectorAll('.rail-item').forEach(el=>el.classList.toggle('is-active',el.hasAttribute(`data-${document.body.dataset.workspace}`)));}).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});
  document.addEventListener('buer:language',refresh);
  document.addEventListener('buer:manual-question',event=>{
    if(controller){showHome();return;}
    const {topic,chapter,report}=event.detail;
    reportOverride=anonymousReport(report);
    const zh=getLanguage()==='zh';
    const questions=zh?{work:'结合这份说明书，我可以怎样找到更适合自己的工作节奏？',relationship:'结合这份说明书，我可以怎样在关系中减少内耗、建立边界？',decision:'结合这份说明书，做重要决定前，我可以怎样观察自己的感受？',chapter:`关于“${chapter||''}”这一章，我可以在生活中做什么小尝试？`}:{work:'Using my manual, how can I find a work rhythm that suits me?',relationship:'Using my manual, how can I build boundaries and feel more at ease in relationships?',decision:'Using my manual, what could I notice in myself before an important decision?',chapter:`What small experiment could I try based on the chapter “${chapter||''}”?`};
    const question=questions[topic]||questions.decision;
    input.value=input.value.trim()?`${input.value.trim()}\n\n${question}`:question;
    $('#buerUseReport').checked=Boolean(reportOverride);showHome();input.dispatchEvent(new Event('input'));input.focus({preventScroll:true});form.scrollIntoView({block:'center',behavior:'smooth'});
  });
  document.querySelectorAll('[data-question]').forEach(el=>el.addEventListener('click',()=>{input.value=t(el.dataset.question==='work'?'workQuestion':'relationshipQuestion');input.focus();}));
  input.addEventListener('focus',()=>{$('#buerContextLabel').hidden=!currentReport();});
  input.addEventListener('keydown',event=>{if(event.key==='Enter' && !event.shiftKey && !event.isComposing){event.preventDefault();form.requestSubmit();}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,160)}px`;});
  function setBusy(busy){$('#buerSend').hidden=busy;$('#buerStop').hidden=!busy;$('#buerNewChat').disabled=busy;input.disabled=busy;document.querySelectorAll('[data-question]').forEach(b=>b.disabled=busy);$('#buerUseReport').disabled=busy;}
  async function ask(question,retry=false){
    if(controller)return;
    const value=(question??input.value).trim();if(!retry && !value)return;
    if(!retry){current.messages.push({role:'user',content:value,date:Date.now()});input.value='';}
    const history=current.messages.filter(message=>!message.failed && message.content).slice(-12).map(({role,content})=>({role,content:content.slice(0,4000)}));
    while(history.reduce((n,m)=>n+m.content.length,0)>14000 && history.length>1)history.shift();
    const answer={role:'assistant',content:'',date:Date.now()};current.messages.push(answer);
    const active=new AbortController();controller=active;setBusy(true);setStatus('connecting');renderMessages();
    const timeout=setTimeout(()=>active.abort('timeout'),110000);
    try {
      if(globalThis.PLUTO_CONFIG?.buerChatEnabled===false)throw new Error('AI_NOT_CONFIGURED');
      const report=$('#buerUseReport').checked?currentReport():null;
      const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,...(report?{report}:{})}),signal:active.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error || 'AI_UNAVAILABLE');}
      if(!response.body)throw new Error('AI_UNAVAILABLE');
      await readBuerEvents(response.body,(type,data)=>{if(type==='delta'){answer.content+=data.text;setStatus('streaming');renderMessages();}});
      setStatus('');
    } catch(error) {
      answer.failed=true;
      if(active.signal.aborted && active.signal.reason!=='timeout')setStatus('stopped');
      else setStatus(error.message==='AI_NOT_CONFIGURED'?'unconfigured':error.message==='RATE_LIMITED'?'rate':'failed');
      answer.errorKey=activeStatus;
    } finally {clearTimeout(timeout);controller=null;setBusy(false);persist();renderMessages();if(matchMedia('(min-width:761px)').matches)input.focus({preventScroll:true});}
  }
  form.addEventListener('submit',event=>{event.preventDefault();void ask(input.value);});
  $('#buerStop').addEventListener('click',()=>controller?.abort());
  $('#buerNewChat').addEventListener('click',()=>{if(controller)return;persist();current={id:crypto.randomUUID(),date:Date.now(),messages:[]};input.value='';reportOverride=null;$('#buerUseReport').checked=false;setStatus('');renderMessages();if(matchMedia('(min-width:761px)').matches)input.focus({preventScroll:true});});
  function renderHistory(){const list=$('#buerHistoryList');list.replaceChildren();if(!threads.length){const p=document.createElement('p');p.textContent=t('noHistory');list.append(p);return;}
    for(const thread of threads){const first=thread.messages.find(m=>m.role==='user')?.content||t('newChat');const b=button(first.slice(0,80),()=>{if(controller)return;persist();current=structuredClone(thread);reportOverride=null;$('#buerUseReport').checked=false;setStatus('');$('#buerHistory').close();showHome();});const small=document.createElement('small');small.textContent=new Intl.DateTimeFormat(getLanguage()==='zh'?'zh-CN':'en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(thread.date));b.append(small);list.append(b);}
  }
  $('#buerHistoryButton').addEventListener('click',()=>{if(controller){setStatus('streaming');return;}persist();renderHistory();$('#buerClearConfirm').hidden=true;$('#buerHistory').showModal();});
  $('#buerCloseHistory').addEventListener('click',()=>$('#buerHistory').close());
  $('#buerClearChats').addEventListener('click',()=>{$('#buerClearConfirm').hidden=false;});
  $('#buerCancelClear').addEventListener('click',()=>{$('#buerClearConfirm').hidden=true;});
  $('#buerConfirmClear').addEventListener('click',()=>{threads=[];current={id:crypto.randomUUID(),date:Date.now(),messages:[]};try{localStorage.removeItem(key);}catch{}$('#buerClearConfirm').hidden=true;renderHistory();renderMessages();});
  refresh();
}
