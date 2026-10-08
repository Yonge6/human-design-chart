import {workspaceStorage} from '../services/buer-workspace.js';
import {compositeGuidance,sectionFoundation,guideV2,guideText,stampGuide} from '../services/buer-pair-guidance.js';
import { relationshipRepository, cleanPerson, relationshipMessages } from '../services/buer-relationships.js';
import { calculateHumanDesign, localToUtcCandidates } from '../../human-design-engine.js';
import { createHumanDesignProfileSnapshot } from '../engine/profile-snapshot.js';
import { readBuerEvents } from '../services/buer-conversation.js';
import { ensureAIConsent, chatAccess, showMembership } from './buer-membership.js';
import { renderAssistantText, renderReadingText } from './buer-message-format.js';
import { cleanPersonalContext, SCOPE_KEYS, RELATION_TYPES, relationshipScopeDefaults } from '../services/buer-personal-context.js';
import { readGrowth, QUESTIONS } from '../services/buer-growth.js';
import { validChatHistory } from '../services/buer-conversation.js';
import { fetchPlaceCandidates, inferTimezoneFromAddress } from '../services/location-service.js';
import { personManualData } from '../services/buer-person-manual.js';
import { createBodygraphRenderer } from '../renderer/bodygraph-renderer.js';
import { orderedPeople, movePerson, relationshipGuidePrompt } from '../services/buer-people-tools.js';
import {PAIR_SECTIONS,makeGuideSource,cleanGuideSource,parsePairSections,pairManualRoleWarning,pairManualStale,guideSourceEqual,pairManualPrompt} from '../services/buer-pair-manual.js';
import { loadingPreview } from './buer-loading.js';
import { pairComparisonGroups, comparisonTable } from './buer-pair-comparison.js';
import { createReadingCache } from '../services/buer-reading-cache.js';
import { pairComposite, compositeSummaryLines } from '../services/buer-pair-composite.js';

const el = (tag, text = '', attributes = {}) => {
  const node = document.createElement(tag); node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
};
const chartNames = { Generator:'生产者', 'Manifesting Generator':'显示生产者', Manifestor:'显现者', Projector:'投射者', Reflector:'反映者',
  'To Respond':'等待回应', 'To Inform':'告知', 'Wait for the Invitation':'等待邀请', 'Wait a Lunar Cycle':'等待一个月亮周期',
  'Emotional - Solar Plexus':'情绪权威 · 太阳神经丛', Sacral:'荐骨权威', Splenic:'脾脏权威', 'Ego Manifested':'意志显现权威', 'Ego Projected':'意志投射权威',
  'Self-Projected':'自我投射权威', Lunar:'月亮权威', 'Mental - Environment':'环境权威', 'No Definition':'无定义', 'Single Definition':'一分人', 'Split Definition':'二分人',
  'Triple Split Definition':'三分人', 'Quadruple Split Definition':'四分人', head:'头顶',ajna:'逻辑',throat:'喉咙',g:'G 中心',heart:'意志',sacral:'荐骨',spleen:'脾脏','solar plexus':'情绪',root:'根部' };

export function initBuerRelationships({ getLanguage, account, openAccount, getReadings = () => [], getManualSections = () => [], getGrowthReport = () => null, translateValue = (_key,value) => value }) {
  const l = (zh, en) => getLanguage() === 'en' ? en : zh;
  const chartText = value => getLanguage() === 'en' ? value : chartNames[value] || value;
  const repo = account ? relationshipRepository(account) : null;
  let owner = null, epoch = 0, people = [], busy = false, dirty = false, controller = null, trigger = null;
  let activeThread = null, unsavedThread = null;
  let personal=null,filter='',peopleOrder=null;
  let readingStorage=null;try{readingStorage=window.localStorage;}catch{}
  const readingCache=createReadingCache({storage:readingStorage});
  const root=el('section','',{id:'buerPeople','aria-label':'People in your life'});
  const hero=el('header','',{class:'people-hero companion-section-hero'}),listContent=el('div','',{class:'people-content'});
  root.append(hero,listContent);document.querySelector('#buerHome').after(root);
  const tab=el('button','',{type:'button',class:'rail-item','data-people':''});
  tab.append(el('i','',{class:'ph ph-users','aria-hidden':'true'}),el('span'));
  document.querySelector('.rail-item[data-profile]').before(tab);tab.onclick=()=>void open();
  const scopeName=k=>({chart:l('我的人类图','My Human Design'),growth:l('成长访谈、经历与行动复盘','Growth, experiences and reflections'),journal:l('私密日记','Private journals'),history:l('历史对话','Previous conversations')})[k];
  const dialog = el('dialog', '', { class: 'journal-dialog relationship-dialog', 'aria-labelledby': 'relationshipHeading' });
  const shell = el('div', '', { class: 'journal-shell' });
  const toolbar = el('header', '', { class: 'journal-toolbar' });
  const heading = el('h2', '', { id: 'relationshipHeading' });
  const close = el('button', '×', { type: 'button', class: 'journal-close' });
  const content = el('div', '', { class: 'journal-content' });
  const status = el('p', '', { class: 'journal-status', role: 'status', 'aria-live': 'polite' });
  toolbar.append(heading, close); shell.append(toolbar, content, status); dialog.append(shell); document.body.append(dialog);
  const valid = ticket => ticket === epoch && owner && account?.user?.id === owner;
  function invalidate() { ++epoch; controller?.abort(); controller = null; busy = false; dirty = false; activeThread = null; unsavedThread = null; }
  function errorMessage(error) {
    const code = error?.message || '';
    if(code==='GUIDE_SOURCE_TOO_LARGE')return l('成长档案超过当前单次完整解读容量，暂不支持该规模的完整生成。本次没有删减资料或覆盖旧版。','The complete source exceeds the current reading capacity. This size is not yet supported; nothing was omitted or overwritten.');
    if(code==='GUIDE_CHART_REQUIRED')return l('请先在成长档案建立你的人类图，并补全 TA 的人类图，再生成双人解读。','Complete your growth-tab chart and their chart before generating a pair reading.');
    if(code==='MANUAL_VERSION_CHANGED')return l('图谱计算版本已更新，请编辑并重新保存 TA 的资料后查看说明书。','The chart engine changed. Edit and save their details before opening the manual.');
    if (error?.code === '40001' || /CHANGED|conflict/.test(code)) return l('资料已在另一处更新。请返回列表刷新后重试；当前文字仍保留。', 'A profile changed on another device. Refresh the list before retrying. Your text is kept.');
    if (/INVALID|RangeError/.test(code) || error instanceof RangeError) return l('请填写有效的出生日期、时间和出生地点。', 'Enter a valid birth date, time and place.');
    if (code === 'DAILY_LIMIT') return l('今天的免费对话已用完，可在会员页面查看详情。', 'Your daily free replies are used. See membership options.');
    return l('暂未完成，请检查网络后重试。未保存的内容仍留在当前页面。', 'Could not finish. Check your connection and retry. Unsaved text remains on this page.');
  }
  function button(zh, en, action, cls = '') {
    const b = el('button', l(zh, en), { type: 'button', class: cls });
    b.onclick = async () => { if (busy) return; const ticket = epoch; try { await action(b); } catch (error) { if (ticket === epoch) status.textContent = errorMessage(error); } };
    return b;
  }
  function field(parent, zh, en, type = 'text', value = '', attrs = {}) {
    const label = el('label', '', { class: 'journal-field' }); label.append(el('span', l(zh, en)));
    const input = el(type === 'textarea' || type === 'select' ? type : 'input', '', { ...(type === 'textarea' || type === 'select' ? {} : { type }), ...attrs });
    input.value = value; label.append(input); parent.append(label); return input;
  }
  function option(select, value, zh, en) { select.append(el('option', l(zh, en), { value })); }
  function consent(parent, zh, en, checked = false) {
    const label = el('label', '', { class: 'relationship-check' });
    const input = el('input', '', { type: 'checkbox' }); input.checked = checked;
    label.append(input, el('span', l(zh, en))); parent.append(label); return input;
  }
  function askConfirm(zh, en) {
    return new Promise(resolve => {
      const d = el('dialog', '', { class: 'journal-confirm', 'aria-label': l('确认操作', 'Confirm') });
      const actions = el('div', '', { class: 'journal-actions' });
      const cancel = el('button', l('取消', 'Cancel'), { type: 'button' });
      const ok = el('button', l('确认', 'Confirm'), { type: 'button', class: 'journal-primary' });
      let answer = false; cancel.onclick = () => d.close(); ok.onclick = () => { answer = true; d.close(); };
      actions.append(cancel, ok); d.append(el('p', l(zh, en)), actions); document.body.append(d);
      d.addEventListener('close', () => { d.remove(); resolve(answer); }, { once: true }); d.showModal(); cancel.focus();
    });
  }
  async function mayLeave() { return !dirty || await askConfirm('有未保存的内容。离开将丢弃这些编辑，确定离开？', 'You have unsaved changes. Discard them and leave?'); }
  close.onclick = async () => { if (busy || !await mayLeave()) return; invalidate(); content.replaceChildren(); dialog.close(); trigger?.focus({ preventScroll: true }); };
  dialog.addEventListener('cancel', e => { e.preventDefault(); close.click(); });
  function reset(title) { content.replaceChildren();content.classList.remove('pair-manual-content');content.scrollTop=0; heading.textContent = title; close.setAttribute('aria-label', l('关闭', 'Close')); status.textContent = ''; dirty = false; }
  function login() {
    listContent.replaceChildren();
    listContent.append(el('h3', l('把在意的人，慢慢读懂。', 'Get to know the people who matter.')),
      el('p', l('为家人、同事或伙伴保存独立档案。资料仅你可见，同一账号可在 H5 与 App 使用。', 'Keep private profiles for family, colleagues and partners, with the same account on web and App.')),
      button('登录并继续', 'Sign in to continue', () => { dialog.close(); openAccount(); }, 'journal-primary'));
  }
  async function list() {
    invalidate(); const ticket = epoch;
    dialog.close();listContent.replaceChildren();
    if (!owner) { login(); return; }
    busy = true;
    if(people.length)drawList();
    const loading=loadingPreview(l('正在读取身边的人…','Loading people…'),people.length?[]:[l('人物档案','People'),l('相处指南','Relationship guides')]);listContent.prepend(loading);
    try { const [rows,context,order] = await Promise.all([repo.people(owner),repo.personal(owner),repo.order(owner)]); if (!valid(ticket)) return; people = rows;personal=context;peopleOrder=order;drawList(); }
    catch (error) { if (valid(ticket)) { loading.remove();listContent.prepend(el('p',errorMessage(error)),button('重新读取', 'Retry', list)); } }
    finally { if (ticket === epoch) busy = false; }
  }
  async function open() { if(dialog.open&&(busy||!await mayLeave()))return;trigger=document.activeElement;document.body.dataset.workspace='people';window.scrollTo({top:0,behavior:'instant'});await list(); }
  function sources(value) { return ({ entered: l('手动填写', 'Manually entered'), self: l('本人资料', 'My profile'), permission: l('经本人允许', 'With permission'), confirmed: l('本人确认', 'Confirmed by them'), guardian: l('监护人管理', 'Managed by guardian') })[value] || ''; }
  function chartSummary(person) {
    const box = el('div', '', { class: 'relationship-summary' });
    box.append(el('small', `${sources(person.source)} · ${person.updated_at ? new Date(person.updated_at).toLocaleDateString(getLanguage() === 'en' ? 'en' : 'zh-CN') : l('待保存', 'Not saved')}`));
    const core = person.chart?.core;
    if (!core) { box.append(el('p', l('出生时刻不确定，暂不生成精确人类图。仍然可以聊真实发生的事。', 'Birth time is unknown. No precise chart is generated; you can still discuss real events.'))); return box; }
    const dl = el('dl');
    for (const [key, zh, en] of [['type', '类型', 'Type'], ['strategy', '策略', 'Strategy'], ['authority', '内在权威', 'Authority'], ['profile', '人生角色', 'Profile']]) {
      dl.append(el('dt', l(zh, en)), el('dd', chartText(core[key])));
    }
    box.append(dl, el('p', l('人类图仅供自我观察，请结合真实相处验证。', 'Use these chart ideas as reflection prompts and check them against real interactions.')));
    const details = el('details'); details.append(el('summary', l('查看图谱资料', 'Chart details')));
    details.append(el('p', `${l('定义：','Definition: ')}${chartText(core.definition)}\n${l('轮回交叉：','Incarnation cross: ')}${core.incarnationCross}`));
    details.append(el('p', `${l('已定义中心：','Defined centers: ')}${person.chart.structure.definedCenters.map(chartText).join(' · ') || l('无','None')}`));
    details.append(el('p', `${l('通道：','Channels: ')}${person.chart.structure.channels.map(pair=>pair.join('–')).join(' · ') || l('无','None')}`));
    box.append(details); return box;
  }
  function drawList() {
    const content=listContent;content.replaceChildren();
    const actions = el('div', '', { class: 'journal-actions' });
    actions.append(button('＋ 添加身边的人', '＋ Add someone', () => edit(null, false), 'journal-primary'),button('调整顺序','Adjust order',sortPeople),button('刷新', 'Refresh', ()=>{readingCache.clear();return list();})); content.append(actions);
    const filters=el('div','',{class:'people-filters',role:'group','aria-label':l('按关系筛选','Filter relationships')});
    for(const [zh,en] of [['',''],...RELATION_TYPES]){const b=button(zh||'全部',en||'All',()=>{filter=zh;drawList();});b.setAttribute('aria-pressed',String(filter===zh));filters.append(b);}content.append(filters);
    const cards = el('div', '', { class: 'journal-list relationship-people' });
    const visible=orderedPeople(people,peopleOrder?.person_ids).filter(p=>!filter||p.relationship===filter||(filter==='其他'&&!RELATION_TYPES.some(([name])=>name===p.relationship)));
    for (const person of visible) {
      const card = el('article', '', { class: 'relationship-person' });
      card.append(
        el('small', person.relationship), el('h3', person.nickname));
      const core=person.chart?.core;card.append(el('p',core?`${chartText(core.type)} · ${core.profile} · ${chartText(core.authority)}`:l('出生时刻待确认 · 也可以先聊聊','Birth time unknown · You can still talk')));
      const controls = el('div', '', { class: 'journal-actions' });
      if(person.chart)controls.append(button('查看说明书', 'View manual', () => manual(person)));
      controls.append(button('编辑资料', 'Edit profile', () => edit(person,false)));
      controls.append(button('相处指南', 'Relationship guide', () => pairManual(person)));
      if (!person.is_self) controls.append(button('聊聊我们的关系', 'Talk about us', () => conversation(person), 'journal-primary'));
      card.append(controls); cards.append(card);
    }
    if (!visible.length) cards.append(el('p', l('从一个你在意的人开始。选择关系，填写 TA 的出生信息，就可以聊聊你们之间的事。', 'Start with someone who matters. Choose a relationship and add their birth information.'), { class: 'journal-empty' }));
    content.append(cards);
  }
  async function pairManual(person,force=false){
    if(force)readingCache.clear();
    invalidate();const ticket=epoch;reset(l(`我与${person.nickname} · 相处说明书`,`Me & ${person.nickname} · Relationship manual`));if(!dialog.open)dialog.showModal();
    content.classList.add('pair-manual-content');
    let source=null,saved=null,selected='overview',pending=null,otherProperties=null,chartError=null;
    const expanded=new Map();
    const tabLabels={overview:['概览','Overview'],communication:['沟通','Talk'],friction:['决策','Decide'],rhythm:['节奏','Rhythm'],repair:['修复','Repair'],practice:['行动','Practice']};
    function selectSection(key){
      expanded.set(selected,[...content.querySelectorAll('.pair-manual-reading details')].map(d=>d.open));
      selected=key;draw();
      content.scrollTop=content.querySelector('.pair-reading-anchor').offsetTop;
      content.querySelector('[role="tab"][aria-selected="true"]').focus({preventScroll:true});
    }
    const remember=()=>{if(valid(ticket)&&!chartError)readingCache.set(owner,person,{source,saved,otherProperties});};
    const localSource=()=>makeGuideSource(getGrowthReport(),readGrowth(workspaceStorage()));
    function draw(){
      content.replaceChildren();
      const actions=el('div','',{class:'pair-reading-actions'});actions.append(button('← 人物列表','← People',list),button('聊聊我们的关系','Talk about us',()=>conversation(person),'journal-primary'));content.append(actions);
      const local=localSource(),snapshot=source?cleanGuideSource(source.payload):local;
      const roleWarning=pairManualRoleWarning(person,saved?.sections);
      const changed=pairManualStale(saved,source,person)||Boolean(source&&!guideSourceEqual(local,source.payload));
      const note=roleWarning?l(`称谓需核对：对方是你的${roleWarning}，请更新旧解读。`,`Check the old reading: this person is your ${roleWarning==='母亲'?'mother':'father'}.`):changed?l('资料有变化，原解读仍可阅读。','Sources changed. Your saved reading remains available.'):saved&&!guideV2(saved.sections)?l('可更新为新版，原解读已保留。','A new format is available; your previous reading is kept.'):saved?l('已保存 · 随时阅读','Saved · Read any time'):l('先阅读基础建议，需要时再生成解读。','Read the basics, then generate a personal reading when ready.');
      const meta=el('div','',{class:'pair-reading-meta'}),more=el('details','',{class:'pair-reading-more'});
      meta.append(el('p',note,{class:'pair-reading-note',role:'status'}));
      more.append(el('summary',l('更多','More')));
      if(source)more.append(el('p',l(`资料更新：${new Date(source.updated_at).toLocaleString()}`,`Source updated: ${new Date(source.updated_at).toLocaleString()}`)));
      if(saved)more.append(el('p',l(`解读保存：${new Date(saved.updated_at).toLocaleString()}`,`Reading saved: ${new Date(saved.updated_at).toLocaleString()}`)));
      more.append(el('p',l('已保存的解读可直接阅读。人类图仅作观察参考。','Saved readings open directly. Human Design is a reflection tool.')),button('从账号刷新','Refresh from account',()=>pairManual(person,true)));
      meta.append(more);content.append(meta,el('div','',{class:'pair-reading-anchor','aria-hidden':'true'}));
      const nav=el('div','',{class:'relationship-manual-tabs pair-manual-tabs',role:'tablist','aria-label':l('相处说明书分类','Reading categories')});
      for(const [key,zh,en] of PAIR_SECTIONS){
        const labels=tabLabels[key],b=button(labels[0],labels[1],()=>selectSection(key));
        for(const [attr,value] of Object.entries({role:'tab',id:`pair-tab-${key}`,'aria-selected':String(selected===key),'aria-controls':'pair-reading-panel',tabindex:selected===key?'0':'-1',title:l(zh,en)}))b.setAttribute(attr,value);
        b.onkeydown=e=>{const keys=PAIR_SECTIONS.map(s=>s[0]),i=keys.indexOf(key);const next=e.key==='ArrowRight'?(i+1)%keys.length:e.key==='ArrowLeft'?(i+keys.length-1)%keys.length:e.key==='Home'?0:e.key==='End'?keys.length-1:null;if(next!==null){e.preventDefault();if(!busy)selectSection(keys[next]);}};
        nav.append(b);
      }content.append(nav);
      const pane=el('section','',{class:'pair-manual-reading',id:'pair-reading-panel',role:'tabpanel',tabindex:'0','aria-labelledby':`pair-tab-${selected}`});content.append(pane);
      const composite=pairComposite(snapshot.chart,person.chart);
      const card=(item)=>{
        const block=el('article','',{class:'pair-guidance-card'});block.append(el('h4',item.title),el('p',item.question),el('p',item.action));
        const evidence=el('details');evidence.append(el('summary',l('为什么这样建议','Why this suggestion')),el('p',item.basis));block.append(evidence);return block;
      };
      const foundation=sectionFoundation(selected,{core:{...snapshot.chart?.core,'Inner Authority':chartText(translateValue('Inner Authority',snapshot.chart?.core?.['Inner Authority']||''))}},{...otherProperties,'Inner Authority':chartText(translateValue('Inner Authority',otherProperties?.['Inner Authority']||person.chart?.core?.authority||''))},getLanguage());
      pane.append(card(foundation));
      const ideas=compositeGuidance(composite,getLanguage());
      const relevant=selected==='overview'?ideas.slice(0,3):ideas.filter(c=>c.section===selected||(selected==='repair'&&c.kind.startsWith('compromise'))||(selected==='practice'&&c.kind==='electromagnetic')).slice(0,2);
      for(const idea of relevant)pane.append(card(idea));
      if(!composite.available)pane.append(el('p',l('双方完整闸门资料尚未齐备，暂不解读合盘连接；上面仍可阅读通用练习。','Complete gates are not yet available. Connection interpretation is withheld; general practices remain available.')));
      if(selected==='overview'){
        const options={language:getLanguage(),otherName:person.nickname};
        const groups=pairComparisonGroups(snapshot.chart,person.chart,{...options,otherProperties,translate:(key,value)=>chartText(translateValue(key,value))});
        if(chartError)pane.append(el('p',l('TA 的完整图谱暂未加载，请重新读取；下方缺失项不代表没有出生资料。','Their full chart could not load. Retry; missing fields do not mean missing birth details.')) ,button('重新读取图谱','Retry chart',()=>pairManual(person)));
        const charts=el('details');charts.append(el('summary',l('查看合盘资料 · 双方基础信息、中心、通道与行星','View chart evidence · core information, centers, channels & planets')));
        charts.append(comparisonTable(groups[0],options));
        for(const group of groups.slice(1))charts.append(comparisonTable(group,options));
        pane.append(charts);
        const connection=el('section','',{class:'pair-manual-prose','aria-label':l('两张图放在一起','Your charts together')});
        connection.append(el('h4',l('两张图放在一起','Your charts together')));
        const summary=el('div');renderReadingText(summary,compositeSummaryLines(pairComposite(snapshot.chart,person.chart),getLanguage()).join('\n\n'));connection.append(summary);
        charts.append(connection);
      }
      if(saved?.sections?.[selected]){
        const reading=el('div','',{class:'pair-manual-prose'}),text=guideText(saved.sections[selected]);
        if(guideV2(saved.sections)){
          const parts=text.split(/\*\*(?:为什么这样建议|Why this suggestion|Why these suggestions)[:：]?\*\*\s*[:：]?/i);renderReadingText(reading,parts[0]);pane.append(reading);
          if(parts.length>1){const why=el('details');why.append(el('summary',l('为什么这样建议 · 个性化解读依据','Why these suggestions · personalized sources')));const body=el('div','',{class:'pair-manual-prose'});renderReadingText(body,parts.slice(1).join('\n\n'));why.append(body);pane.append(why);}
        }else{const legacy=el('details');legacy.append(el('summary',l('阅读保留的旧版解读','Read the preserved previous version')));renderReadingText(reading,text);legacy.append(reading);pane.append(legacy);}
      }
      else pane.append(el('p',l('这一分类的个性化解读尚未生成。生成一次后，即可随时回来阅读。','This personalized section has not been generated. Generate once, then return to read any time.')));
      pane.querySelectorAll('details').forEach((d,i)=>{d.open=expanded.get(selected)?.[i]||false;});
      const generateActions=el('div','',{class:'journal-actions pair-manual-generate'});
      if(pending)generateActions.append(button('重试保存解读（不重新生成）','Retry saving (no regeneration)',b=>generate(false,true,b),'journal-primary'));
      else {
        if(source)generateActions.append(button(saved?'更新解读':'生成分类解读',saved?'Update reading':'Generate reading',b=>generate(false,false,b),'journal-primary'));
        generateActions.append(button(source?'同步当前成长档案并更新':'使用当前成长档案生成',source?'Sync current growth profile & update':'Generate from current growth profile',b=>generate(true,false,b),source?'':'journal-primary'));
      }
      content.append(generateActions,el('small',l('仅生成或更新时调用 AI，并按现有额度计次；阅读已保存内容不计次。','Only generation or updates call AI and use the existing allowance. Reading saved content is free.')));
    }
    async function generate(sync,retry=false,activeButton){
      if(busy||!valid(ticket))return;
      busy=true;status.textContent=l('正在准备相处说明书…','Preparing your relationship manual…');
      const phase=(zh,en)=>{for(const b of content.querySelectorAll('.pair-manual-generate button'))b.disabled=true;if(activeButton){activeButton.textContent=l(zh,en);activeButton.setAttribute('aria-busy','true');}};
      phase(retry?'保存中…':'准备中…',retry?'Saving…':'Preparing…');
      try{
        if(sync&&!await askConfirm('确认当前成长档案属于你？将把其中的人类图、全部访谈回答、经历、行动复盘及已有成长指南同步到当前账号，并交由 AI 生成相处说明书（包括此前未勾选单独参考的成长记录）。不包含日记和历史聊天。','Confirm this device’s growth profile is yours. Sync its chart and all answers, experiences, actions, reflections and growth report for AI processing, including growth records not individually enabled before. Journals and chats are excluded.')){status.textContent='';return;}
        if(!valid(ticket))return;
        if(!retry){
          const next=sync?localSource():source?.payload;
          if(!next?.chart||!person.chart)throw Error('GUIDE_CHART_REQUIRED');
          if(!await ensureAIConsent()||!valid(ticket))return;
          readingCache.clear();
          if(sync&&(!source||!guideSourceEqual(next,source.payload))){const row=await repo.saveGuideSource(owner,source?.revision||0,crypto.randomUUID(),next);if(!valid(ticket))return;source=row;}
          const session=await account.client.auth.getSession();if(!valid(ticket))return;
          if(!session.data?.session?.access_token)throw Error('SIGN_IN_REQUIRED');
          const access=await chatAccess();if(!valid(ticket))return;
          controller=new AbortController();
          phase('生成中…','Generating…');
          status.textContent=l('正在生成六个分类的解读，已有内容可继续阅读…','Generating six sections. Your existing reading remains available…');
          const response=await fetch(`${account.config.apiUrl}/v1/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.data.session.access_token}`},body:JSON.stringify({mode:'relationship-guide',relationship:{personId:person.id,personRevision:person.revision,sourceRevision:source.revision},messages:[{role:'user',content:pairManualPrompt(getLanguage(),person,pairComposite(source.payload.chart,person.chart))}],...access}),signal:controller.signal});
          if(!response.ok){if(response.status===402)showMembership();throw Error((await response.json().catch(()=>({}))).error||'AI_UNAVAILABLE');}
          let raw='';await readBuerEvents(response.body,(type,data)=>{if(type==='delta'){raw+=data.text;if(raw.length>50000)throw Error('INVALID_GUIDE_SECTIONS');}});
          if(!valid(ticket))return;pending={sections:stampGuide(parsePairSections(raw)),mutation:crypto.randomUUID(),language:getLanguage()==='en'?'en':'zh'};dirty=true;
        }
        status.textContent=l('解读已生成，正在保存到账号…','Reading generated. Saving to your account…');
        phase('保存中…','Saving…');
        const row=await repo.savePairManual(owner,person,source,saved,pending.sections,pending.language,pending.mutation);if(!valid(ticket))return;
        saved=row;pending=null;dirty=false;remember();status.textContent=l('说明书已保存，下次打开直接阅读。','Saved. Open it next time without generating again.');
      }catch(error){if(valid(ticket))status.textContent=errorMessage(error)+(saved?l(' 旧版说明书仍保留。',' Your previous reading is preserved.'):'');}
      finally{if(valid(ticket)){controller=null;busy=false;draw();}}
    }
    const cached=force?null:readingCache.get(owner,person);
    if(cached&&valid(ticket)){({source,saved,otherProperties}=cached);draw();status.textContent='';return;}
    busy=true;status.textContent=l('正在读取已保存的说明书…','Loading saved reading…');
    const preview=loadingPreview(l('正在连接账号，读取已保存的内容…','Connecting to your account and loading saved content…'),PAIR_SECTIONS.map(s=>s[getLanguage()==='en'?2:1]));
    content.append(chartSummary(person),preview);
    try{const rows=await Promise.all([repo.guideSource(owner),repo.pairManual(owner,person.id),personManualData(person).catch(error=>{chartError=error;return null;})]);if(!valid(ticket))return;[source,saved]=rows;otherProperties=rows[2]?.Properties||null;remember();status.textContent='';draw();}
    catch(error){if(valid(ticket)){preview.remove();status.textContent=errorMessage(error);content.append(button('重新读取','Retry',()=>pairManual(person)));}}
    finally{if(ticket===epoch)busy=false;}
  }
  function sortPeople(){
    invalidate();const ticket=epoch;reset(l('调整顺序','Adjust order'));if(!dialog.open)dialog.showModal();
    const initial=orderedPeople(people,peopleOrder?.person_ids).map(p=>p.id);let ids=[...initial],dragged=null,mutation=crypto.randomUUID();
    const byId=new Map(people.map(p=>[p.id,p]));
    content.append(el('p',l('把常联系的人放在前面。电脑可拖动，也可使用上移、下移或置顶；保存后同步到账号。','Keep the people you contact most at the top. Drag on desktop or use the move buttons, then save to your account.')));
    const rows=el('ol','',{class:'people-sort-list'}),live=el('p','',{role:'status','aria-live':'polite',class:'people-sort-status'});content.append(rows,live);
    const controls=el('div','',{class:'journal-actions'});
    const save=button('保存顺序','Save order',async()=>{
      busy=true;save.disabled=true;
      try{const saved=await repo.saveOrder(owner,peopleOrder?.revision||0,mutation,ids);if(!valid(ticket))return;peopleOrder=saved;dirty=false;dialog.close();drawList();}
      catch(error){if(valid(ticket))status.textContent=error?.code==='40001'?l('列表已在其他设备改变。当前顺序已保留，请重新读取后再调整。','The list changed on another device. Your draft is kept; reload before reordering.'):errorMessage(error);}
      finally{if(ticket===epoch){busy=false;save.disabled=!dirty;}}
    },'journal-primary');
    controls.append(save,button('取消','Cancel',async()=>{if(await mayLeave()){invalidate();dialog.close();drawList();}}),button('重新读取','Reload',async()=>{if(await mayLeave())await list();}));content.append(controls);
    function move(id,target){if(busy||!valid(ticket))return;ids=movePerson(ids,id,target);mutation=crypto.randomUUID();dirty=ids.some((value,index)=>initial[index]!==value);draw();live.textContent=l(`已移到第 ${ids.indexOf(id)+1} 位`, `Moved to position ${ids.indexOf(id)+1}`);rows.querySelector(`[data-sort-id="${id}"] button`)?.focus();}
    function draw(){rows.replaceChildren();save.disabled=!dirty;ids.forEach((id,index)=>{
      const person=byId.get(id),row=el('li','',{'data-sort-id':id,draggable:String(matchMedia('(pointer:fine)').matches)});
      row.append(el('span',`${index+1}. ${person.nickname}`,{class:'people-sort-name'}));
      const actions=el('div','',{class:'people-sort-controls'});
      for(const [zh,en,target,disabled] of [['上移','Up',index-1,index===0],['下移','Down',index+1,index===ids.length-1],['置顶','Top',0,index===0]]){const b=button(zh,en,()=>move(id,target));b.disabled=disabled;b.setAttribute('aria-label',l(`${person.nickname}：${zh}`,`${person.nickname}: ${en}`));actions.append(b);}row.append(actions);
      row.ondragstart=e=>{if(busy){e.preventDefault();return;}dragged=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);};
      row.ondragover=e=>{if(!busy&&dragged&&dragged!==id){e.preventDefault();e.dataTransfer.dropEffect='move';}};
      row.ondrop=e=>{e.preventDefault();if(dragged)move(dragged,index);dragged=null;};row.ondragend=()=>dragged=null;rows.append(row);
    });}
    draw();if(!ids.length)live.textContent=l('先添加身边的人，再来调整顺序。','Add someone first, then adjust the order.');
  }
  async function manual(person){
    invalidate();const ticket=epoch;reset(l(`${person.nickname}的说明书`,`${person.nickname}’s Life Manual`));
    if(!dialog.open)dialog.showModal();
    content.append(button('← 返回人物列表','← Back to people',list));
    status.textContent=l('正在整理 TA 的说明书…','Preparing their manual…');
    const preview=loadingPreview(l('正在整理图谱与阅读内容…','Preparing chart and reading…'),[l('概览','Overview'),l('深入解读','In depth'),l('人类图','Human Design')]);content.append(preview);
    try{
      const data=await personManualData(person);if(!valid(ticket))return;preview.remove();
      const root=el('section','',{class:'relationship-manual'});
      root.append(el('p',l('以下“你”指这份说明书的主人。请结合 TA 的实际经历理解，不用图谱替 TA 下结论。','“You” refers to the owner of this manual. Use their real experiences, not the chart alone, to understand them.'),{class:'relationship-chat-note'}));
      const nav=el('div','',{class:'relationship-manual-tabs',role:'tablist','aria-label':l('说明书内容','Manual sections')});root.append(nav);
      const panels=[],tabs=[];
      for(const [key,zh,en] of [['overview','概览','Overview'],['reading','深入解读','In depth'],['chart','人类图','Human Design']]){
        const panel=el('section','',{id:`person-manual-${key}`,role:'tabpanel','aria-labelledby':`person-tab-${key}`});panels.push(panel);
        const tab=button(zh,en,()=>select(key));tab.id=`person-tab-${key}`;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);tabs.push(tab);nav.append(tab);root.append(panel);
      }
      function select(key){panels.forEach((p,i)=>{const active=p.id===`person-manual-${key}`;p.hidden=!active;tabs[i].setAttribute('aria-selected',String(active));tabs[i].tabIndex=active?0:-1;});}
      tabs.forEach((tab,i)=>tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;tabs[next].click();tabs[next].focus();});
      panels[0].append(chartSummary(person));
      const sections=getManualSections(data);
      if(!sections.length)throw Error('MANUAL_UNAVAILABLE');
      const lead=el('article','',{class:'relationship-manual-lead'});lead.append(el('h3',sections[0].title),el('p',sections[0].text));panels[0].append(lead);
      sections.forEach(({title,text},i)=>{const chapter=el('details','',{class:'buer-chapter'});chapter.open=i===0;const summary=el('summary');summary.append(el('span',String(i+1).padStart(2,'0'),{class:'buer-chapter-number'}),el('h3',title));const body=el('div','',{class:'buer-chapter-body'});body.append(el('p',text));chapter.append(summary,body);panels[1].append(chapter);});
      const chartLayout=el('div','',{class:'chart-layout relationship-chart-layout'});
      const graphColumn=el('div','',{class:'chart-graph'});
      const graph=el('div','',{class:'relationship-bodygraph'});graphColumn.append(graph);
      const planetNames={'Sun':'太阳','Earth':'地球','North Node':'北交点','South Node':'南交点','Moon':'月亮','Mercury':'水星','Venus':'金星','Mars':'火星','Jupiter':'木星','Saturn':'土星','Uranus':'天王星','Neptune':'海王星','Pluto':'冥王星'};
      for(const [key,zh,en] of [['Design','设计','Design'],['Personality','人格','Personality']]){
        const column=el('div','',{class:`side-column${key==='Personality'?' right':''}`});column.append(el('p',l(zh,en)));
        const list=el('ol','',{class:'planet-list','aria-label':l(`${zh}行星位置`,`${en} planetary activations`)});
        for(const [name,a] of Object.entries(data[key])){const row=el('li');const label=el('span');label.append(el('i','',{class:`wb-${name.replaceAll(' ','-')}`,'aria-hidden':'true'}),el('em',l(planetNames[name]||name,name)));row.append(label,el('b',`${a.Gate}.${a.Line}`));list.append(row);}column.append(list);chartLayout.append(column);
        if(key==='Design')chartLayout.append(graphColumn);
      }
      const legend=el('div','',{class:'poster-center-legend'});for(const [cls,zh,en] of [['defined-swatch','已定义中心','Defined center'],['undefined-swatch','未定义中心','Undefined center']]){const item=el('span');item.append(el('i','',{class:cls}),el('span',l(zh,en)));legend.append(item);}graphColumn.append(legend);
      panels[2].append(chartLayout);
      select('overview');content.append(root);
      const colors=Object.fromEntries(['head','ajna','throat','g','heart','sacral','splenic','solar-plexus','root'].map(k=>[`${k}-center`,'#718565']));
      await createBodygraphRenderer({container:graph,templateUrl:new URL('../../assets/bodygraph-template.svg',import.meta.url).href,centerColors:colors,label:l(`${person.nickname}的人类图`,`${person.nickname}’s Human Design`)})(data);
      if(!valid(ticket))return;
      content.append(button('聊聊我们的关系','Talk about us',()=>conversation(person),'journal-primary'));status.textContent='';
    }catch(error){if(valid(ticket)){preview.remove();status.textContent=errorMessage(error);}}
  }
  function edit(person, isSelf) {
    invalidate(); const ticket = epoch, id = person?.id || crypto.randomUUID();
    if(!dialog.open)dialog.showModal();
    reset(l(isSelf ? '我的主档案' : '人物档案', isSelf ? 'My profile' : 'Person profile'));
    content.append(button('← 返回档案', '← Back to profiles', async () => { if (await mayLeave()) await list(); }));
    const form = el('form'); content.append(form);
    const nickname = field(form, '称呼（建议使用昵称）', 'Preferred name', 'text', person?.nickname || '', { maxlength: '60', required: '', autocomplete: 'off' });
    const relationship = field(form, '与我的关系', 'Relationship to me', 'text', person?.relationship || (isSelf ? l('自己', 'Me') : ''), { maxlength: '60', required: '', placeholder: l('例如：夫人、女儿、同事、合伙人', 'Partner, daughter, colleague…') });
    const options=el('div','',{class:'people-filters'});for(const [zh,en] of RELATION_TYPES)options.append(button(zh,en,()=>{relationship.value=zh;dirty=true;}));relationship.parentElement.after(options);
    if (isSelf) relationship.readOnly = true;
    const birth = el('div', '', { class: 'journal-metadata' }); form.append(birth);
    const date = field(birth, '出生日期', 'Birth date', 'date', person?.birth.date || '', { required: '', max: new Date().toISOString().slice(0,10) });
    const time = field(birth, '出生时间（24小时制）', 'Birth time (24 hour)', 'time', person?.birth.time || '', { required: '' });
    const location = field(form, '出生地点', 'Birth place', 'text', person?.birth.location || '', { required: '', maxlength: '160', autocomplete: 'off', placeholder: l('城市、区县或地区', 'City, district or region') });
    let selectedPlace = person?.birth.location && person?.birth.timezone ? {label:person.birth.location,timezone:person.birth.timezone} : null;
    const matches = el('div', '', {class:'relationship-place-results'}); location.parentElement.after(matches);
    const occurrence = field(form, '夏令时回拨时刻', 'Repeated time during clock change', 'select');
    option(occurrence, '', '如遇重复时刻，请选择', 'Choose if this time occurs twice'); option(occurrence, 'earlier', '第一次出现', 'Earlier occurrence'); option(occurrence, 'later', '第二次出现', 'Later occurrence');
    occurrence.parentElement.hidden = true;
    const resetOccurrence = () => { occurrence.value=''; occurrence.parentElement.hidden=true; };
    date.oninput=time.oninput=resetOccurrence;
    location.oninput=()=>{selectedPlace=null;matches.replaceChildren();resetOccurrence();};
    const notes = field(form, '我的观察（选填，仅保存，不自动发送给 AI）', 'My observations (saved privately, not automatically sent to AI)', 'textarea', person?.notes || '', { maxlength: '2000', rows: '3' });
    const save = el('button', l('保存档案', 'Save profile'), { type: 'submit', class: 'journal-primary' }); form.append(save);
    form.addEventListener('input', () => { dirty = true; });
    form.onsubmit = async event => {
      event.preventDefault(); if (busy || !valid(ticket) || !form.reportValidity()) return;
      busy = true; save.disabled = true; status.textContent = l('正在计算并保存…', 'Calculating and saving…');
      try {
        const query=location.value.trim();
        if(!query) throw Error('INVALID_BIRTH');
        if(!selectedPlace) {
          const inferred=inferTimezoneFromAddress(query);
          if(inferred) selectedPlace={label:query,timezone:inferred};
          else {
            controller=new AbortController(); const request=controller;
            const timeout=setTimeout(()=>request.abort(),12000);
            let features;try {features=await fetchPlaceCandidates(query,{language:getLanguage(),signal:request.signal});} finally {clearTimeout(timeout);}
            if(!valid(ticket))return;
            if(location.value.trim()!==query){status.textContent=l('地点已修改，请重新保存。','Place changed. Save again.');return;}
            matches.replaceChildren();
            const seenPlaces=new Set();
            for(const feature of features){
              const [lon,lat]=feature.geometry?.coordinates||[];if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
              const props=feature.properties||{},label=[...new Set([props.name,props.city,props.state,props.country].filter(Boolean))].join(', ');
              const zone=props.countrycode?.toUpperCase()==='CN'?'Asia/Shanghai':globalThis.tzlookup?.(lat,lon);if(!label||!zone)continue;
              const key=`${label}|${zone}`;if(seenPlaces.has(key))continue;seenPlaces.add(key);
              matches.append(button(label,label,()=>{selectedPlace={label,timezone:zone};location.value=label;matches.replaceChildren();resetOccurrence();dirty=true;status.textContent=l('地点已确认，请保存档案。','Place selected. Save the profile to continue.');}));
            }
            status.textContent=matches.childElementCount?l('请选择匹配的出生地点，再保存档案。','Select the matching birth place, then save.'):l('未找到出生地点，请补充城市和国家后重试。','Place not found. Add the city and country and try again.');
            return;
          }
        }
        const timezone=selectedPlace.timezone;
        let chart = null;
        {
          const [year, month, day] = date.value.split('-').map(Number), [hour, minute] = time.value.split(':').map(Number);
          const candidates = localToUtcCandidates(year, month, day, hour, minute, timezone);
          if (!candidates.length) throw Error('INVALID_BIRTH');
          if (candidates.length > 1 && !occurrence.value) { occurrence.parentElement.hidden = false; status.textContent = l('这个时刻在夏令时回拨中出现两次，请确认第一次或第二次。', 'This time occurs twice during a clock change. Choose earlier or later.'); return; }
          if (candidates[occurrence.value === 'later' ? candidates.length-1 : 0] > Date.now()) throw Error('INVALID_BIRTH');
          const result = await calculateHumanDesign({ name: nickname.value, location: location.value, year, month, day, hour, minute, timezone, timeDisambiguation: occurrence.value || 'earlier' });
          chart = await createHumanDesignProfileSnapshot({ input: { birthDate: date.value, birthTime: time.value, timezone, locationLabel: location.value }, result });
        }
        if (!valid(ticket)) return;
        readingCache.clear();
        await repo.save(owner, id, person?.revision || 0, crypto.randomUUID(), cleanPerson({ nickname: nickname.value, relationship: relationship.value, is_self: isSelf, source: person?.source || (isSelf?'self':'entered'),
          birth: { date: date.value, time: time.value, timezone, location: location.value.trim(), certainty: 'known' }, chart, notes: notes.value }));
        if (!valid(ticket)) return; dirty = false; await list();
      } catch (error) { if (valid(ticket)) status.textContent = errorMessage(error); }
      finally { if (ticket === epoch) { busy = false; save.disabled = false; } }
    };
    if (person) content.append(button('删除人物及相关关系对话', 'Delete profile and its conversations', async () => {
      if (!await askConfirm('删除后，该人物资料及涉及此人的关系对话会从所有设备移除，无法恢复。日记不会被删除。', 'Delete this profile and its relationship conversations from every device? This cannot be undone. Journals are kept.')) return;
      if (!valid(ticket)) return; busy = true;
      try { readingCache.clear();await repo.remove(owner, person, crypto.randomUUID()); if (valid(ticket)) { dirty = false; await list(); } }
      finally { if (ticket === epoch) busy = false; }
    }, 'journal-danger'));
  }
  function settings(afterSave=null){
    invalidate();const ticket=epoch;reset(l('我的参考资料与授权','My context & permissions'));if(!dialog.open)dialog.showModal();
    const current=cleanPersonalContext(personal?.payload||{}),form=el('form');content.append(form);
    form.append(el('p',l('不用重新填写自己的人类图。确认已有说明书属于你，再选择允许豆豆龙参考的资料。授权按账号保存，可随时关闭。','No need to enter your birth details again. Select your existing reading and the sources Doudoulong may use. These account permissions can be changed any time.')));
    const controls={};for(const key of SCOPE_KEYS)controls[key]=consent(form,scopeName(key),scopeName(key),current.scopes[key]);
    const readings=getReadings().slice(0,30).filter(x=>x.properties);
    const legacy=people.find(p=>p.is_self&&p.chart?.core);if(legacy){const c=legacy.chart.core;readings.push({id:'legacy',label:l('之前确认的本人图谱','Previously confirmed personal chart'),properties:{Type:c.type,Strategy:c.strategy,'Inner Authority':c.authority,Profile:c.profile,Definition:c.definition,'Incarnation Cross':c.incarnationCross}});}
    const select=field(form,'我的说明书（只选属于自己的）','My reading (select only your own)','select');
    option(select,'keep',current.chart?'保留账号已确认的说明书':'暂不使用本人说明书',current.chart?'Keep my confirmed reading':'No personal reading yet');
    readings.forEach((r,i)=>option(select,String(i),r.label||`说明书 ${i+1}`,r.label||`Reading ${i+1}`));option(select,'none','移除账号中的本人图谱摘要','Remove my saved chart summary');
    const importLocal=consent(form,'我确认本机成长档案和普通对话属于我，同意更新到当前账号的参考资料','I confirm the local growth profile and general chats are mine. Update this account’s reference snapshot.');
    form.append(el('p',l('档案与对话在登录后自动账号同步；这里单独管理提供给 AI 的参考快照。勾选后更新已允许 AI 使用的访谈、经历，以及行动复盘与普通对话；日记直接从本账号云端按问题检索。未勾选则保留上次同步的参考资料。','Profiles and chats sync after sign-in; this separately manages the AI reference snapshot. Confirm to update AI-enabled reflections, experiences, actions and general chats. Journals are retrieved from this account’s cloud library. Otherwise the previous snapshot is kept.')));
    if(personal)form.append(el('small',`${l('参考资料更新于：','Snapshot updated: ')}${new Date(personal.updated_at).toLocaleString()} · ${current.answers.length+current.stories.length+current.actions.length} ${l('条成长记录','growth records')} · ${current.chats.length} ${l('段普通对话','general chats')}`));
    form.append(el('p',l('开启后，相关摘录会发送至我们的服务器及 第三方 AI 服务 生成建议。每次只选择与问题相关的片段，不代表读取完整人生；对方人物资料不会公开或分享给对方。','Enabled relevant excerpts are sent to our server and a third-party AI service for advice, not an entire life history. People’s profiles are private and never shared with them.')));
    const confirm=consent(form,'我已了解并确认以上资料范围与 AI 使用方式','I understand and confirm these data sources and AI processing.');confirm.required=true;
    const save=el('button',l('保存授权与参考资料','Save permissions & context'),{type:'submit',class:'journal-primary'});form.append(save);form.oninput=()=>{dirty=true;};
    form.onsubmit=async e=>{e.preventDefault();if(busy||!valid(ticket)||!form.reportValidity())return;busy=true;save.disabled=true;
      try{
        let next={...current,scopes:Object.fromEntries(SCOPE_KEYS.map(k=>[k,controls[k].checked]))};
        if(select.value==='none')next.chart=null;else if(select.value!=='keep')next.chart=readings[Number(select.value)]?.properties||null;
        if(importLocal.checked){
          const g=readGrowth(workspaceStorage());next.answers=g.shareAssessment?QUESTIONS.filter(q=>g.answers[q.id]?.trim()).map(q=>({id:q.id,title:l(q.zh,q.en),body:g.answers[q.id]})):[];
          next.stories=g.stories.filter(s=>s.useAI);next.actions=g.actions.map(a=>({id:a.id,title:a.title,body:`${a.metric}\n${a.reflection}\n${a.done?'已完成':'进行中'}`,date:a.due}));
          let chats=[];try{chats=validChatHistory(JSON.parse(workspaceStorage().getItem('buer-conversations-v1')||'[]'));}catch{}
          next.chats=chats.map(c=>({id:c.id,title:c.messages.find(m=>m.role==='user')?.content.slice(0,80)||'',body:c.messages.filter(m=>!m.failed).map(m=>`${m.role}: ${m.content}`).join('\n').slice(0,4000),date:new Date(c.date).toISOString()}));
        }
        const saved=await repo.savePersonal(owner,personal?.revision||0,next);if(!valid(ticket))return;personal=saved;dirty=false;
        if(afterSave)await afterSave();else await list();
      }catch(error){if(valid(ticket))status.textContent=errorMessage(error);}finally{if(ticket===epoch){busy=false;save.disabled=false;}}
    };
  }
  async function conversation(person, previous = null, guide = false) {
    invalidate(); const ticket = epoch;
    reset(l('我与','Me & ') + person.nickname);if(!dialog.open)dialog.showModal();
    const controls = el('div', '', { class: 'relationship-chat-toolbar' });
    controls.append(button('← 返回人物列表', '← Back to people', async () => { if (await mayLeave()) await list(); }), button('新对话', 'New chat', async () => { if (await mayLeave()) await conversation(person); })); content.append(controls);
    const pair = el('details', '', { class: 'relationship-context' });pair.append(el('summary', l('对话设置','Chat settings')));
    pair.append(el('p',`${person.relationship} · ${person.chart?.core?`${chartText(person.chart.core.type)} / ${person.chart.core.profile}`:l('暂无精确人类图','No precise chart')}`));
    const allowed=relationshipScopeDefaults(personal),scopes={...allowed};
    const scopeControls=[];for(const key of SCOPE_KEYS){const c=consent(pair,scopeName(key),scopeName(key),scopes[key]);c.disabled=!allowed[key]||Boolean(previous);scopeControls.push(c);c.onchange=()=>{scopes[key]=c.checked;thread.id=crypto.randomUUID();thread.revision=0;thread.messages=[];drawMessages();status.textContent=l('参考范围已更改，将开启新对话，不携带旧回复。','New context scope starts a fresh conversation without old replies.');};}
    pair.append(button('管理我的参考资料','Manage my context',async()=>{if(await mayLeave())settings(()=>conversation(person));}));
    pair.append(el('small',l('按问题选取相关片段；本机资料使用上次确认同步的版本。日记检索最近 1000 篇，对话检索本人与 TA 最近 30 段，不调用其他人物档案。','Relevant excerpts only. Local records use your confirmed snapshot. Searches the latest 1,000 journals and 30 conversations with this person, never other people’s profiles.')));
    const sources=el('details','',{class:'relationship-context'});sources.hidden=true;sources.append(el('summary',l('本次参考','Reply sources')));const sourceList=el('ul');sources.append(sourceList);pair.append(sources);
    const outdated = Boolean(previous);
    activeThread = previous ? { ...previous, messages: [...previous.messages] } : { id: crypto.randomUUID(), revision: 0, person_id: person.id, person_revision: person.revision, context_revision:personal?.revision||0, messages: [] };
    const thread = activeThread;
    const messages = el('div', '', { class: 'relationship-messages', 'aria-live': 'polite' }); content.append(messages);
    function drawMessages() {
      messages.replaceChildren();
      for (const message of thread.messages) {
        const box = el('article', '', { class: `relationship-message ${message.role}` }); box.append(el('small', message.role === 'user' ? l('我', 'Me') : l('豆豆龙', 'Doudoulong')));
        const text = el('div'); if (message.role === 'assistant') renderAssistantText(text, message.content); else text.textContent = ['zh','en'].some(lang=>message.content===relationshipGuidePrompt(lang))?l('请给我和 TA 一份相处指南。','Please create a relationship guide for us.'):message.content; box.append(text); messages.append(box);
      }
    }
    drawMessages();
    const form = el('form', '', { class: 'relationship-compose' });
    const question = field(form, '想聊聊你们之间的什么事？', 'What would you like to talk about?', 'textarea', '', { maxlength: '3000', rows: '4', required: '', placeholder: l('说说刚刚发生的事，或你心里的困惑…', 'Tell me what happened, or what is on your mind…') });
    question.oninput = () => { dirty = Boolean(question.value.trim()) || Boolean(unsavedThread); };
    const send = el('button', l('和豆豆龙聊聊', 'Talk to Doudoulong'), { type: 'submit', class: 'journal-primary' }); form.append(send);
    const retrySave = button('重新保存这段对话', 'Retry saving this conversation', async () => {
      if (!unsavedThread) return; busy = true;
      try { const saved = await repo.saveConversation(owner, thread, unsavedThread); if (!valid(ticket)) return; Object.assign(thread, saved); unsavedThread = null; dirty = Boolean(question.value.trim()); retrySave.hidden = true; send.disabled = false; status.textContent = l('对话已同步', 'Conversation synced'); }
      finally { if (ticket === epoch) busy = false; }
    }); retrySave.hidden = true; form.append(retrySave);
    const notice=el('p',personal?l('结合你已开启的个人资料与 TA 的人类图，陪你一起梳理。','Using your enabled context and their chart to think it through together.'):l('发送即同意豆豆龙参考本账号的人类图、成长记录、日记、历史对话及 TA 的图谱；相关片段由第三方 AI 处理。可在对话设置调整。','Sending allows relevant excerpts from this account’s chart, growth, journals, conversations and their chart to be processed by a third-party AI service. Adjust in Chat settings.'),{class:'relationship-chat-note'});
    if(personal)notice.append(el('span',l(' 相关片段由第三方 AI 处理，对话仅你可见。',' Relevant excerpts use a third-party AI service; conversations remain private.')));
    content.append(form,notice,pair);
    if (outdated) { form.hidden = true; status.textContent = l('这是保存的对话。开启新对话将使用最新资料与授权，避免带入已关闭的内容。', 'Saved conversation. Start a new one to use current information and permissions.'); }
    form.onsubmit = async event => {
      event.preventDefault(); if (busy || unsavedThread || outdated || !valid(ticket) || !form.reportValidity()) return;
      busy = true; send.disabled = true; question.disabled = true;
      scopeControls.forEach(c=>c.disabled=true);
      const value = question.value.trim(); const before = [...thread.messages];
      try {
        if (!await ensureAIConsent() || !valid(ticket)) return;
        if(!personal){
          const saved=await repo.savePersonal(owner,0,cleanPersonalContext({scopes}));
          if(!valid(ticket))return;personal=saved;thread.context_revision=saved.revision;Object.assign(allowed,relationshipScopeDefaults(saved));
        }
        controller = new AbortController(); status.textContent = l('正在认真读你们的故事…', 'Reading your story…');
        const session = await account.client.auth.getSession(); if (!valid(ticket)) return;
        if (!session.data?.session?.access_token) throw Error('SIGN_IN_REQUIRED');
        const access = await chatAccess(); if (!valid(ticket)) return;
        const response = await fetch(`${account.config.apiUrl}/v1/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session.access_token}` },
          body: JSON.stringify({ mode: 'relationship', relationship: { version:2, personId: person.id, personRevision: person.revision, contextRevision:personal?.revision||0, scopes }, messages: relationshipMessages(thread.messages, value), ...access }), signal: controller.signal });
        if (!response.ok) { if (response.status === 402) showMembership(); throw Error((await response.json().catch(() => ({}))).error || 'AI_UNAVAILABLE'); }
        if (!valid(ticket)) return;
        const answer = { role: 'assistant', content: '' }; thread.messages.push({ role: 'user', content: value }, answer); drawMessages();
        let completeText = '';
        await readBuerEvents(response.body, (type, data) => { if(!valid(ticket))return;if(type==='context'){sources.hidden=false;sourceList.replaceChildren(...(data.sources||[]).map(s=>el('li',`${s.kind} · ${s.title||s.date||s.id}`)));if(!data.sources?.length)sourceList.append(el('li',l('未检索到相关个人摘录，仅参考可用图谱与当前提问。','No personal excerpts retrieved; using available charts and your question.')));} if (type === 'delta') { completeText += data.text; answer.content = completeText.length <= 6000 ? completeText : completeText.slice(0,5920) + l('\n（回复较长，已保留前半部分。可以继续追问。）', '\n(Long reply shortened. Ask a follow-up to continue.)'); drawMessages(); } });
        if (!valid(ticket)) return;
        thread.messages = thread.messages.slice(-40); question.value = ''; unsavedThread = crypto.randomUUID(); dirty = true;
        const saved = await repo.saveConversation(owner, thread, unsavedThread);
        if (!valid(ticket)) return; Object.assign(thread, saved); unsavedThread = null; dirty = false; status.textContent = l('对话已同步到你的账号', 'Conversation synced to your account');
      } catch (error) {
        if (!valid(ticket)) return;
        if (!unsavedThread) { thread.messages = before; drawMessages(); }
        retrySave.hidden = !unsavedThread; status.textContent = errorMessage(error);
      } finally { if (ticket === epoch) { controller = null; busy = false; send.disabled = Boolean(unsavedThread); question.disabled = false;scopeControls.forEach((c,i)=>c.disabled=!allowed[SCOPE_KEYS[i]]||Boolean(unsavedThread)); } }
    };
    const history = el('details', '', { class: 'relationship-context' }); history.append(el('summary', l('过往关系对话', 'Previous conversations')));
    history.append(button('读取过往对话', 'Load conversations', async () => {
      const rows = await repo.conversations(owner, person.id); if (!valid(ticket)) return;
      history.querySelectorAll('button,p').forEach(n => n.remove());
      if (!rows.length) history.append(el('p', l('还没有保存的关系对话。', 'No saved conversations yet.')));
      for (const row of rows) history.append(button(row.messages[0]?.content.slice(0,60) || '对话', row.messages[0]?.content.slice(0,60) || 'Conversation', async () => { if (await mayLeave()) await conversation(person, row); }, 'relationship-history'));
    })); content.append(history);
    if(guide){question.value=relationshipGuidePrompt(getLanguage());dirty=true;form.hidden=true;await form.onsubmit({preventDefault(){}});if(valid(ticket))form.hidden=false;}
  }
  function language() { tab.querySelector('span').textContent=l('身边的人','People');
    hero.replaceChildren(el('p',l('BUER WITHIN / 身边的人','BUER WITHIN / PEOPLE'),{class:'growth-eyebrow'}),el('h1',l('理解彼此，让相处多一点从容。','Understand each other. Make room to grow.')),el('p',l('从你在意的人开始，聊聊你们之间的事。','Start with someone who matters. Talk about life together.')),el('img','',{class:'companion-section-art',src:'assets/companion-people-listening.webp',alt:'',width:'320',height:'320'}));
    if(document.body.dataset.workspace==='people'&&!dialog.open&&!busy)void list(); }
  document.addEventListener('buer:language', language); language();
  document.addEventListener('buer:relationships', () => void open());
  account?.subscribe(user => { const next = user?.id || null; if (owner === next) return; if(owner)readingCache.clear();invalidate(); owner = next; people = [];personal=null;peopleOrder=null; content.replaceChildren();listContent.replaceChildren(); status.textContent = '';dialog.close(); if (document.body.dataset.workspace==='people') void list(); });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  const viewport = () => { const v = window.visualViewport, follow = v && matchMedia('(max-width:760px)').matches && Math.abs(v.scale-1)<.01; dialog.style.setProperty('--journal-viewport-height', follow ? `${v.height}px` : '100dvh'); dialog.style.setProperty('--journal-viewport-top', follow ? `${v.offsetTop}px` : '0px'); };
  window.visualViewport?.addEventListener('resize', viewport); window.visualViewport?.addEventListener('scroll', viewport); viewport();
  return { open };
}
