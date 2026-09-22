import {anonymousReport} from '../services/buer-conversation.js';

const words={
  zh:{startKicker:'认识自己 · 从这里开始',formHeading:'你的独特，\n从这里展开。',formLead:'一份理解自己的起点。用你的出生信息，探索能量、决策与相处的方式。',stepOne:'用你喜欢的称呼开始',stepTwo:'找到属于你的起点',stepThree:'让说明书更完整',privacy:'计算在你的设备上完成。出生资料不会随 AI 对话自动发送。',resultKicker:'每个人，都有自己的使用方式',resultLead:'理解你的倾向，把选择留给自己。',overview:'我的概览',reading:'深入解读',chart:'人类图',questionHeading:'把说明书带进真实生活',workQuestionLabel:'找到适合我的工作节奏',relationshipQuestionLabel:'在关系里少一点内耗',readingKicker:'慢一点，读懂自己',readingHeading:'不止是结论，更是观察的线索。',readingLead:'从最在意的章节开始。把有共鸣的地方放进生活里验证。',chartHeading:'你的完整人类图',chartLead:'保留完整图谱，方便查看和保存。你也可以随时回到文字解读。',guideKicker:'让理解，继续发生',guideHeading:'读到这里，\n你想到了什么？',guideLead:'带上这份说明书，聊聊眼前的一个决定，或最近让你在意的一件事。',talk:'结合说明书聊一聊',contextNote:'仅带入类型、策略、权威与人生角色；你发送问题后才会请求 AI。',dailyKicker:'一点点，回到自己',dailyHeading:'每天，一个小提醒',dailyLead:'首页会根据最近保存的说明书，为你准备一句今日提示。也可以分享给在意的人。',viewDaily:'看看今日提示',reflectionNote:'说明书是一份自我观察的邀请，不是对你的定义，也不替你决定人生。',chapterQuestion:'聊聊这一章',summaryTitle:'属于你的核心配置',title:name=>name?`${name}的人生说明书`:'我的人生说明书'},
  en:{startKicker:'SELF-KNOWLEDGE · START HERE',formHeading:'Your own way\nof being.',formLead:'A starting point for understanding yourself. Explore your energy, decisions and relationships with your birth information.',stepOne:'Start with your preferred name',stepTwo:'Find your starting point',stepThree:'Complete your personal picture',privacy:'Calculated on your device. Birth details are never automatically attached to AI conversations.',resultKicker:'THERE IS MORE THAN ONE WAY TO BE',resultLead:'Understand your tendencies. Keep the choices yours.',overview:'Overview',reading:'In depth',chart:'Human Design',questionHeading:'Bring your manual into real life',workQuestionLabel:'Find my natural work rhythm',relationshipQuestionLabel:'Feel more at ease in relationships',readingKicker:'TAKE TIME TO KNOW YOURSELF',readingHeading:'More than answers. Clues to explore.',readingLead:'Start with the chapter that matters to you. Test what resonates in everyday life.',chartHeading:'Your complete Human Design chart',chartLead:'Keep the full chart for reference or download. Your written reading is always one tab away.',guideKicker:'KEEP THE CONVERSATION GOING',guideHeading:'What comes\nto mind?',guideLead:'Bring your manual into a conversation about a decision or something that has been on your mind.',talk:'Explore with my manual',contextNote:'Only type, strategy, authority and profile are attached. AI is requested only after you send.',dailyKicker:'A LITTLE CLOSER TO YOURSELF',dailyHeading:'One thought, every day',dailyLead:'Home offers a daily thought from your latest saved manual. Share it with someone you care about.',viewDaily:'See today’s thought',reflectionNote:'An invitation to observe yourself, not a definition of who you are or a decision made for you.',chapterQuestion:'Explore this chapter',summaryTitle:'Your core configuration',title:name=>name?`${name}’s Life Manual`:'My Life Manual'},
};
export function initBuerManual({getLanguage,getData,getSections,isNative}) {
  const $=s=>document.querySelector(s),t=k=>words[getLanguage()==='en'?'en':'zh'][k];
  let active='overview',openChapters=new Set([0]),renderedData=null;
  const tabs=[...document.querySelectorAll('[data-manual-tab]')];
  function selectTab(name,focus=false){
    active=isNative&&name==='chart'?'overview':name;
    for(const tab of tabs){const selected=tab.dataset.manualTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;if(selected&&focus)tab.focus();}
    $('#manualChartTab').hidden=isNative;
  }
  for(const tab of tabs){tab.addEventListener('click',()=>selectTab(tab.dataset.manualTab));tab.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const visible=tabs.filter(t=>!t.hidden);const index=visible.indexOf(tab);const next=event.key==='Home'?0:event.key==='End'?visible.length-1:(index+(event.key==='ArrowRight'?1:-1)+visible.length)%visible.length;selectTab(visible[next].dataset.manualTab,true);});}
  function startQuestion(topic,chapter){
    const properties=getData()?.Properties;if(!properties)return;
    document.dispatchEvent(new CustomEvent('buer:manual-question',{detail:{topic,chapter,report:anonymousReport(properties)}}));
  }
  document.querySelectorAll('[data-manual-question]').forEach(button=>button.addEventListener('click',()=>startQuestion(button.dataset.manualQuestion)));
  $('#detailReading').addEventListener('click',()=>{selectTab('reading');$('#manualReadingTab').focus({preventScroll:true});$('.buer-manual-tabs').scrollIntoView({block:'start',behavior:'smooth'});});
  $('#buerManualDaily').addEventListener('click',()=>{document.querySelector('[data-home]').click();$('#dailyTipCard').scrollIntoView({block:'center',behavior:'smooth'});});
  function refresh(event){
    document.querySelectorAll('[data-manual-copy]').forEach(node=>node.textContent=t(node.dataset.manualCopy));
    const data=event?.detail?.data||getData();if(!data?.Properties)return;
    if(data!==renderedData){active='overview';openChapters=new Set([0]);renderedData=data;}
    $('#buerManualTitle').textContent=t('title')($('#privacyMode').checked?'':data.Properties.Name);
    $('#resultSummaryTitle').textContent=t('summaryTitle');
    const fragment=document.createDocumentFragment();
    getSections(data).forEach(({title,text},index)=>{
      const chapter=document.createElement('details');chapter.className='buer-chapter';chapter.open=openChapters.has(index);
      const summary=document.createElement('summary'),number=document.createElement('span'),heading=document.createElement('h3'),icon=document.createElement('i');
      number.className='buer-chapter-number';number.textContent=String(index+1).padStart(2,'0');heading.textContent=title;icon.className='ph ph-plus';icon.setAttribute('aria-hidden','true');summary.append(number,heading,icon);
      const body=document.createElement('div');body.className='buer-chapter-body';const p=document.createElement('p');p.textContent=text;
      const button=document.createElement('button');button.type='button';button.textContent=t('chapterQuestion');button.addEventListener('click',()=>startQuestion('chapter',title));
      chapter.addEventListener('toggle',()=>{if(chapter.isConnected){if(chapter.open)openChapters.add(index);else openChapters.delete(index);}});
      body.append(p,button);chapter.append(summary,body);fragment.append(chapter);
    });
    $('#buerReadingContent').replaceChildren(fragment);selectTab(active);
  }
  const updateSteps=()=>{const step=Number($('.form-panel').dataset.currentFormStep||1);document.querySelectorAll('[data-manual-step]').forEach(node=>{node.classList.toggle('is-current',Number(node.dataset.manualStep)===step);node.classList.toggle('is-complete',Number(node.dataset.manualStep)<step);if(Number(node.dataset.manualStep)===step)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');});};
  new MutationObserver(updateSteps).observe($('.form-panel'),{attributes:true,attributeFilter:['data-current-form-step']});
  document.addEventListener('buer:result',refresh);document.addEventListener('buer:language',refresh);
  $('#privacyMode').addEventListener('change',refresh);updateSteps();refresh();selectTab('overview');
}
