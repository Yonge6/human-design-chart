import { relationshipRepository, cleanPerson, relationshipMessages } from '../services/buer-relationships.js';
import { calculateHumanDesign, localToUtcCandidates } from '../../human-design-engine.js';
import { createHumanDesignProfileSnapshot } from '../engine/profile-snapshot.js';
import { readBuerEvents } from '../services/buer-conversation.js';
import { ensureAIConsent, chatAccess, showMembership } from './buer-membership.js';
import { renderAssistantText } from './buer-message-format.js';
import { cleanPersonalContext, SCOPE_KEYS, RELATION_TYPES, relationshipScopeDefaults } from '../services/buer-personal-context.js';
import { readGrowth, QUESTIONS } from '../services/buer-growth.js';
import { validChatHistory } from '../services/buer-conversation.js';
import { fetchPlaceCandidates, inferTimezoneFromAddress } from '../services/location-service.js';
import { personManualData } from '../services/buer-person-manual.js';
import { createBodygraphRenderer } from '../renderer/bodygraph-renderer.js';

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

export function initBuerRelationships({ getLanguage, account, openAccount, getReadings = () => [], getManualSections = () => [] }) {
  const l = (zh, en) => getLanguage() === 'en' ? en : zh;
  const chartText = value => getLanguage() === 'en' ? value : chartNames[value] || value;
  const repo = account ? relationshipRepository(account) : null;
  let owner = null, epoch = 0, people = [], busy = false, dirty = false, controller = null, trigger = null;
  let activeThread = null, unsavedThread = null;
  let personal=null,filter='';
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
    if(code==='MANUAL_VERSION_CHANGED')return l('图谱计算版本已更新，请编辑并重新保存 TA 的资料后查看说明书。','The chart engine changed. Edit and save their details before opening the manual.');
    if (error?.code === '40001' || /CHANGED|conflict/.test(code)) return l('资料已在另一处更新。请返回列表刷新后重试；当前文字仍保留。', 'A profile changed on another device. Refresh the list before retrying. Your text is kept.');
    if (/INVALID|RangeError/.test(code) || error instanceof RangeError) return l('请填写有效的出生日期、时间和出生地点。', 'Enter a valid birth date, time and place.');
    if (code === 'DAILY_LIMIT') return l('今天的免费对话已用完，可在会员页面查看详情。', 'Your daily free replies are used. See membership options.');
    return l('暂未完成，请检查网络后重试。未保存的内容仍留在当前页面。', 'Could not finish. Check your connection and retry. Unsaved text remains on this page.');
  }
  function button(zh, en, action, cls = '') {
    const b = el('button', l(zh, en), { type: 'button', class: cls });
    b.onclick = async () => { if (busy) return; const ticket = epoch; try { await action(); } catch (error) { if (ticket === epoch) status.textContent = errorMessage(error); } };
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
  function reset(title) { content.replaceChildren(); heading.textContent = title; close.setAttribute('aria-label', l('关闭', 'Close')); status.textContent = ''; dirty = false; }
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
    busy = true;listContent.append(el('p',l('正在读取身边的人…','Loading people…'),{role:'status'}));
    try { const [rows,context] = await Promise.all([repo.people(owner),repo.personal(owner)]); if (!valid(ticket)) return; people = rows;personal=context;drawList(); }
    catch (error) { if (valid(ticket)) { listContent.replaceChildren(el('p',errorMessage(error)),button('重新读取', 'Retry', list)); } }
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
    actions.append(button('＋ 添加身边的人', '＋ Add someone', () => edit(null, false), 'journal-primary'),button('我的参考资料与授权','My context & permissions',settings),button('刷新', 'Refresh', list)); content.append(actions);
    content.append(el('p',personal?l('自己的资料沿用已有记录，无需重复建档。可在「我的参考资料与授权」更新同步。','Your existing personal information is reused. Update it in My context & permissions.'):l('只需添加对方。聊之前可授权使用你已有的资料，无需再建立自己的档案。','Just add the other person. Authorize your existing information before chatting; no duplicate self profile.'),{class:'people-note'}));
    const filters=el('div','',{class:'people-filters',role:'group','aria-label':l('按关系筛选','Filter relationships')});
    for(const [zh,en] of [['',''],...RELATION_TYPES]){const b=button(zh||'全部',en||'All',()=>{filter=zh;drawList();});b.setAttribute('aria-pressed',String(filter===zh));filters.append(b);}content.append(filters);
    const cards = el('div', '', { class: 'journal-list relationship-people' });
    const visible=people.filter(p=>!p.is_self&&(!filter||p.relationship===filter||(filter==='其他'&&!RELATION_TYPES.some(([name])=>name===p.relationship))));
    for (const person of visible) {
      const card = el('article', '', { class: 'relationship-person' });
      card.append(el('span', person.nickname.slice(0, 1), { class: 'relationship-avatar', 'aria-hidden': 'true' }),
        el('small', person.relationship), el('h3', person.nickname));
      const core=person.chart?.core;card.append(el('p',core?`${chartText(core.type)} · ${core.profile} · ${chartText(core.authority)}`:l('出生时刻待确认 · 也可以先聊聊','Birth time unknown · You can still talk')));
      const controls = el('div', '', { class: 'journal-actions' });
      controls.append(button('了解 TA', 'About them', () => detail(person)));
      if (!person.is_self) controls.append(button('聊聊我们的关系', 'Talk about us', () => conversation(person), 'journal-primary'));
      card.append(controls); cards.append(card);
    }
    if (!visible.length) cards.append(el('p', l('从一个你在意的人开始。选择关系，填写 TA 的出生信息，就可以聊聊你们之间的事。', 'Start with someone who matters. Choose a relationship and add their birth information.'), { class: 'journal-empty' }));
    content.append(cards);
  }
  function detail(person){invalidate();reset(person.nickname);if(!dialog.open)dialog.showModal();content.append(el('p',person.relationship),chartSummary(person));if(person.notes)content.append(el('p',person.notes));const actions=el('div','',{class:'relationship-detail-actions'});if(person.chart)actions.append(button('查看 TA 的说明书','View their Life Manual',()=>manual(person)));actions.append(button('编辑 TA 的资料','Edit their profile',()=>edit(person,false)),button('聊聊我们的关系','Talk about us',()=>conversation(person),'journal-primary'));content.append(actions);}
  async function manual(person){
    invalidate();const ticket=epoch;reset(l(`${person.nickname}的说明书`,`${person.nickname}’s Life Manual`));
    content.append(button('← 返回人物档案','← Back to profile',()=>detail(person)));
    status.textContent=l('正在整理 TA 的说明书…','Preparing their manual…');
    try{
      const data=await personManualData(person);if(!valid(ticket))return;
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
      const graph=el('div','',{class:'relationship-bodygraph'});panels[2].append(graph);
      const planets=el('div','',{class:'relationship-planet-columns'});
      const planetNames={'Sun':'太阳','Earth':'地球','North Node':'北交点','South Node':'南交点','Moon':'月亮','Mercury':'水星','Venus':'金星','Mars':'火星','Jupiter':'木星','Saturn':'土星','Uranus':'天王星','Neptune':'海王星','Pluto':'冥王星'};
      for(const [key,zh,en] of [['Design','设计','Design'],['Personality','人格','Personality']]){const column=el('div');column.append(el('h3',l(zh,en)));for(const [name,a] of Object.entries(data[key]))column.append(el('p',`${l(planetNames[name]||name,name)} · ${a.Gate}.${a.Line}`));planets.append(column);}panels[2].append(planets);
      select('overview');content.append(root);
      const colors=Object.fromEntries(['head','ajna','throat','g','heart','sacral','splenic','solar-plexus','root'].map(k=>[`${k}-center`,'#718565']));
      await createBodygraphRenderer({container:graph,templateUrl:new URL('../../assets/bodygraph-template.svg',import.meta.url).href,centerColors:colors,label:l(`${person.nickname}的人类图`,`${person.nickname}’s Human Design`)})(data);
      if(!valid(ticket))return;
      content.append(button('聊聊我们的关系','Talk about us',()=>conversation(person),'journal-primary'));status.textContent='';
    }catch(error){if(valid(ticket))status.textContent=errorMessage(error);}
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
        await repo.save(owner, id, person?.revision || 0, crypto.randomUUID(), cleanPerson({ nickname: nickname.value, relationship: relationship.value, is_self: isSelf, source: person?.source || (isSelf?'self':'entered'),
          birth: { date: date.value, time: time.value, timezone, location: location.value.trim(), certainty: 'known' }, chart, notes: notes.value }));
        if (!valid(ticket)) return; dirty = false; await list();
      } catch (error) { if (valid(ticket)) status.textContent = errorMessage(error); }
      finally { if (ticket === epoch) { busy = false; save.disabled = false; } }
    };
    if (person) content.append(button('删除人物及相关关系对话', 'Delete profile and its conversations', async () => {
      if (!await askConfirm('删除后，该人物资料及涉及此人的关系对话会从所有设备移除，无法恢复。日记不会被删除。', 'Delete this profile and its relationship conversations from every device? This cannot be undone. Journals are kept.')) return;
      if (!valid(ticket)) return; busy = true;
      try { await repo.remove(owner, person, crypto.randomUUID()); if (valid(ticket)) { dirty = false; await list(); } }
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
    form.append(el('p',l('本机资料不会因登录而自动归入账号。勾选后同步已允许 AI 使用的访谈、经历，以及行动复盘与普通对话；日记直接从本账号云端按问题检索。未勾选则保留上次同步的参考资料。','Local data is never assigned to an account merely by signing in. Confirm to import AI-enabled reflections, experiences, actions and general chats. Journals are retrieved from this account’s cloud library. Otherwise the previous snapshot is kept.')));
    if(personal)form.append(el('small',`${l('参考资料更新于：','Snapshot updated: ')}${new Date(personal.updated_at).toLocaleString()} · ${current.answers.length+current.stories.length+current.actions.length} ${l('条成长记录','growth records')} · ${current.chats.length} ${l('段普通对话','general chats')}`));
    form.append(el('p',l('开启后，相关摘录会发送至我们的服务器及 第三方 AI 服务 生成建议。每次只选择与问题相关的片段，不代表读取完整人生；对方人物资料不会公开或分享给对方。','Enabled relevant excerpts are sent to our server and a third-party AI service for advice, not an entire life history. People’s profiles are private and never shared with them.')));
    const confirm=consent(form,'我已了解并确认以上资料范围与 AI 使用方式','I understand and confirm these data sources and AI processing.');confirm.required=true;
    const save=el('button',l('保存授权与参考资料','Save permissions & context'),{type:'submit',class:'journal-primary'});form.append(save);form.oninput=()=>{dirty=true;};
    form.onsubmit=async e=>{e.preventDefault();if(busy||!valid(ticket)||!form.reportValidity())return;busy=true;save.disabled=true;
      try{
        let next={...current,scopes:Object.fromEntries(SCOPE_KEYS.map(k=>[k,controls[k].checked]))};
        if(select.value==='none')next.chart=null;else if(select.value!=='keep')next.chart=readings[Number(select.value)]?.properties||null;
        if(importLocal.checked){
          const g=readGrowth(localStorage);next.answers=g.shareAssessment?QUESTIONS.filter(q=>g.answers[q.id]?.trim()).map(q=>({id:q.id,title:l(q.zh,q.en),body:g.answers[q.id]})):[];
          next.stories=g.stories.filter(s=>s.useAI);next.actions=g.actions.map(a=>({id:a.id,title:a.title,body:`${a.metric}\n${a.reflection}\n${a.done?'已完成':'进行中'}`,date:a.due}));
          let chats=[];try{chats=validChatHistory(JSON.parse(localStorage.getItem('buer-conversations-v1')||'[]'));}catch{}
          next.chats=chats.map(c=>({id:c.id,title:c.messages.find(m=>m.role==='user')?.content.slice(0,80)||'',body:c.messages.filter(m=>!m.failed).map(m=>`${m.role}: ${m.content}`).join('\n').slice(0,4000),date:new Date(c.date).toISOString()}));
        }
        const saved=await repo.savePersonal(owner,personal?.revision||0,next);if(!valid(ticket))return;personal=saved;dirty=false;
        if(afterSave)await afterSave();else await list();
      }catch(error){if(valid(ticket))status.textContent=errorMessage(error);}finally{if(ticket===epoch){busy=false;save.disabled=false;}}
    };
  }
  async function conversation(person, previous = null) {
    invalidate(); const ticket = epoch;
    reset(l('我与','Me & ') + person.nickname);if(!dialog.open)dialog.showModal();
    const controls = el('div', '', { class: 'relationship-chat-toolbar' });
    controls.append(button('← 返回', '← Back', async () => { if (await mayLeave()) detail(person); }), button('新对话', 'New chat', async () => { if (await mayLeave()) await conversation(person); })); content.append(controls);
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
        const text = el('div'); if (message.role === 'assistant') renderAssistantText(text, message.content); else text.textContent = message.content; box.append(text); messages.append(box);
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
  }
  const nav = document.querySelector('#drawerHome .drawer-nav');
  const entry = button('', '', open); const icon = el('span', '', { class: 'drawer-nav-icon' }); icon.append(el('i', '', { class: 'ph ph-users', 'aria-hidden': 'true' }));
  const label = el('span'); const title = el('strong'), hint = el('small'); label.append(title, hint); entry.append(icon, label, el('span','›',{class:'drawer-chevron','aria-hidden':'true'})); nav?.prepend(entry);
  function language() { title.textContent = l('身边的人', 'People');hint.textContent=l('理解彼此，让相处多一点从容','Understand each other, with room to grow');tab.querySelector('span').textContent=l('身边的人','People');
    hero.replaceChildren(el('p',l('BUER WITHIN / 身边的人','BUER WITHIN / PEOPLE'),{class:'growth-eyebrow'}),el('h1',l('理解彼此，让相处多一点从容。','Understand each other. Make room to grow.')),el('p',l('从你在意的人开始，聊聊你们之间的事。','Start with someone who matters. Talk about life together.')),el('img','',{class:'companion-section-art',src:'assets/companion-profile.webp',alt:'',width:'320',height:'320'}));
    if(document.body.dataset.workspace==='people'&&!dialog.open&&!busy)void list(); }
  document.addEventListener('buer:language', language); language();
  document.addEventListener('buer:relationships', () => void open());
  account?.subscribe(user => { const next = user?.id || null; if (owner === next) return; invalidate(); owner = next; people = [];personal=null; content.replaceChildren();listContent.replaceChildren(); status.textContent = '';dialog.close(); if (document.body.dataset.workspace==='people') void list(); });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  const viewport = () => { const v = window.visualViewport, follow = v && matchMedia('(max-width:760px)').matches && Math.abs(v.scale-1)<.01; dialog.style.setProperty('--journal-viewport-height', follow ? `${v.height}px` : '100dvh'); dialog.style.setProperty('--journal-viewport-top', follow ? `${v.offsetTop}px` : '0px'); };
  window.visualViewport?.addEventListener('resize', viewport); window.visualViewport?.addEventListener('scroll', viewport); viewport();
  return { open };
}
