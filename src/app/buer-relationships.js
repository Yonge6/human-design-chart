import { relationshipRepository, cleanPerson, relationshipMessages } from '../services/buer-relationships.js';
import { calculateHumanDesign, localToUtcCandidates } from '../../human-design-engine.js';
import { createHumanDesignProfileSnapshot } from '../engine/profile-snapshot.js';
import { readBuerEvents } from '../services/buer-conversation.js';
import { ensureAIConsent, chatAccess, showMembership } from './buer-membership.js';
import { renderAssistantText } from './buer-message-format.js';

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

export function initBuerRelationships({ getLanguage, account, openAccount }) {
  const l = (zh, en) => getLanguage() === 'en' ? en : zh;
  const chartText = value => getLanguage() === 'en' ? value : chartNames[value] || value;
  const repo = account ? relationshipRepository(account) : null;
  let owner = null, epoch = 0, people = [], busy = false, dirty = false, controller = null, trigger = null;
  let activeThread = null, unsavedThread = null;
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
    if (error?.code === '40001' || /CHANGED|conflict/.test(code)) return l('资料已在另一处更新。请返回列表刷新后重试；当前文字仍保留。', 'A profile changed on another device. Refresh the list before retrying. Your text is kept.');
    if (/INVALID|RangeError/.test(code) || error instanceof RangeError) return l('请检查出生日期、时间和时区。时间未知时可选择“出生时刻不确定”。', 'Check the birth date, time and time zone, or choose unknown birth time.');
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
    reset(l('关系档案', 'Relationships'));
    content.append(el('h3', l('把在意的人，慢慢读懂。', 'Get to know the people who matter.')),
      el('p', l('为家人、同事或伙伴保存独立档案。资料仅你可见，同一账号可在 H5 与 App 使用。', 'Keep private profiles for family, colleagues and partners, with the same account on web and App.')),
      button('登录并继续', 'Sign in to continue', () => { dialog.close(); openAccount(); }, 'journal-primary'));
  }
  async function list() {
    invalidate(); const ticket = epoch;
    if (!owner) { login(); return; }
    reset(l('关系档案', 'Relationships')); busy = true; status.textContent = l('正在读取档案…', 'Loading profiles…');
    try { const rows = await repo.people(owner); if (!valid(ticket)) return; people = rows; drawList(); }
    catch (error) { if (valid(ticket)) { status.textContent = errorMessage(error); content.append(button('重新读取', 'Retry', list)); } }
    finally { if (ticket === epoch) busy = false; }
  }
  async function open() { trigger = document.activeElement; if (!dialog.open) dialog.showModal(); await list(); }
  function sources(value) { return ({ self: l('本人资料', 'My profile'), permission: l('经本人允许', 'With permission'), confirmed: l('本人确认', 'Confirmed by them'), guardian: l('监护人管理', 'Managed by guardian') })[value] || ''; }
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
    reset(l('关系档案', 'Relationships'));
    content.append(el('span', l('人与人之间，留一点理解', 'ROOM TO UNDERSTAND EACH OTHER'), { class: 'journal-kicker' }),
      el('h3', l('从「我」开始，认识我们。', 'Start with me. Understand us.')),
      el('p', l('先确认哪份档案是你，再添加家人或伙伴。添加的资料仅你可见；每次对话只参考你选中的双方。', 'Identify your own profile, then add family or partners. Profiles stay private; each conversation uses only the selected pair.')));
    const actions = el('div', '', { class: 'journal-actions' });
    if (!people.some(p => p.is_self)) actions.append(button('建立我的主档案', 'Create my profile', () => edit(null, true), 'journal-primary'));
    actions.append(button('添加人物', 'Add a person', () => edit(null, false)), button('刷新', 'Refresh', list)); content.append(actions);
    const cards = el('div', '', { class: 'journal-list relationship-people' });
    for (const person of [...people].sort((a,b) => Number(b.is_self) - Number(a.is_self))) {
      const card = el('article', '', { class: 'relationship-person' });
      card.append(el('span', person.nickname.slice(0, 1), { class: 'relationship-avatar', 'aria-hidden': 'true' }),
        el('small', person.is_self ? l('我的主档案', 'MY PROFILE') : person.relationship), el('h3', person.nickname), chartSummary(person));
      if (person.notes) card.append(el('p', `${l('我的观察：', 'My observation: ')}${person.notes}`, { class: 'relationship-notes' }));
      const controls = el('div', '', { class: 'journal-actions' });
      controls.append(button('编辑档案', 'Edit profile', () => edit(person, person.is_self)));
      if (!person.is_self) controls.append(button('聊聊我们的关系', 'Talk about us', () => conversation(person), 'journal-primary'));
      card.append(controls); cards.append(card);
    }
    if (!people.length) cards.append(el('p', l('可以从已有说明书导入，也可以重新填写出生信息。', 'Import a saved reading or enter birth details.'), { class: 'journal-empty' }));
    content.append(cards);
  }
  function edit(person, isSelf) {
    invalidate(); const ticket = epoch, id = person?.id || crypto.randomUUID();
    reset(l(isSelf ? '我的主档案' : '人物档案', isSelf ? 'My profile' : 'Person profile'));
    content.append(button('← 返回档案', '← Back to profiles', async () => { if (await mayLeave()) await list(); }));
    const form = el('form'); content.append(form);
    const nickname = field(form, '称呼（建议使用昵称）', 'Preferred name', 'text', person?.nickname || '', { maxlength: '60', required: '', autocomplete: 'off' });
    const relationship = field(form, '与我的关系', 'Relationship to me', 'text', person?.relationship || (isSelf ? l('自己', 'Me') : ''), { maxlength: '60', required: '', placeholder: l('例如：夫人、女儿、同事、合伙人', 'Partner, daughter, colleague…') });
    if (isSelf) relationship.readOnly = true;
    const source = field(form, '资料来源', 'Source', 'select');
    for (const [value, zh, en] of (isSelf ? [['self','我自己的资料','My own information']] : [['permission','已获得本人允许','I have their permission'], ['confirmed','由本人确认的资料','Confirmed by this person'], ['guardian','我是其监护人','I am their guardian']])) option(source, value, zh, en);
    source.value = person?.source || (isSelf ? 'self' : 'permission');
    const importer = field(form, '从本机已有说明书导入（可选）', 'Import a reading on this device (optional)', 'select');
    option(importer, '', '手动填写 / 保持当前内容', 'Enter details / keep current');
    let history = []; try { const saved = JSON.parse(localStorage.getItem('pluto-chart-history-v1') || '[]'); if (Array.isArray(saved)) history = saved.filter(x => x?.input?.place?.timezone).slice(0, 10); } catch {}
    history.forEach((row, i) => option(importer, String(i), row.input.name || `说明书 ${i+1}`, row.input.name || `Reading ${i+1}`));
    const certainty = field(form, '出生时刻', 'Birth time accuracy', 'select');
    option(certainty, 'unknown', '出生时刻不确定（无需人类图也能对话）', 'Unknown time (you can still talk)'); option(certainty, 'known', '出生日期和时刻已知', 'Date and time are known');
    certainty.value = person?.birth.certainty || 'unknown';
    const birth = el('div', '', { class: 'journal-metadata' }); form.append(birth);
    const date = field(birth, '出生日期', 'Birth date', 'date', person?.birth.date || '', { max: new Date().toISOString().slice(0,10) });
    const time = field(birth, '出生时间（24小时制）', 'Birth time (24 hour)', 'time', person?.birth.time || '');
    const location = field(form, '出生地点（选填）', 'Birth place (optional)', 'text', person?.birth.location || '', { maxlength: '160' });
    const timezone = field(form, '出生地时区', 'Birth place time zone', 'select');
    const zones = [...new Set(['Asia/Shanghai', person?.birth.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone, ...(Intl.supportedValuesOf?.('timeZone') || ['UTC'])].filter(Boolean))];
    zones.forEach(zone => option(timezone, zone, zone === 'Asia/Shanghai' ? '中国标准时间 · Asia/Shanghai' : zone, zone)); timezone.value = person?.birth.timezone || 'Asia/Shanghai';
    const occurrence = field(form, '夏令时回拨时刻', 'Repeated time during clock change', 'select');
    option(occurrence, '', '如遇重复时刻，请选择', 'Choose if this time occurs twice'); option(occurrence, 'earlier', '第一次出现', 'Earlier occurrence'); option(occurrence, 'later', '第二次出现', 'Later occurrence');
    occurrence.parentElement.hidden = true;
    const accuracy = () => { const known = certainty.value === 'known'; date.required = time.required = known; time.disabled = timezone.disabled = !known; occurrence.parentElement.hidden = true; occurrence.value = ''; };
    certainty.onchange = accuracy; accuracy();
    importer.onchange = () => {
      const row = history[Number(importer.value)]; if (importer.value === '' || !row) return;
      const input = row.input; if (!nickname.value) nickname.value = input.name || '';
      date.value = `${input.year}-${String(input.month).padStart(2,'0')}-${String(input.day).padStart(2,'0')}`;
      const hour = input.ampm ? Number(input.hour) % 12 + (String(input.ampm).toLowerCase() === 'pm' ? 12 : 0) : Number(input.hour);
      time.value = `${String(hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}`;
      if (!zones.includes(input.place.timezone)) option(timezone, input.place.timezone, input.place.timezone, input.place.timezone);
      timezone.value = input.place.timezone; location.value = input.location || input.place.label || ''; certainty.value = 'known'; accuracy(); dirty = true;
    };
    const notes = field(form, '我的观察（选填，仅保存，不自动发送给 AI）', 'My observations (saved privately, not automatically sent to AI)', 'textarea', person?.notes || '', { maxlength: '2000', rows: '3' });
    const permission = consent(form, isSelf ? '我确认这是我的主档案，并同意保存到当前账号。' : '我已取得允许或具有监护权限，同意将这些资料保存到我的私密账号。', isSelf ? 'This is my own profile. Save it to this account.' : 'I have permission or guardianship to save these details to my private account.'); permission.required = true;
    form.append(el('p', l('保存后会同步到你的账号。人类图在本机计算；未知出生时刻不会生成精确图谱。', 'Saved profiles sync to your account. Charts are calculated on this device; unknown birth times do not generate precise charts.')));
    const save = el('button', l('保存档案', 'Save profile'), { type: 'submit', class: 'journal-primary' }); form.append(save);
    form.addEventListener('input', () => { dirty = true; });
    form.onsubmit = async event => {
      event.preventDefault(); if (busy || !valid(ticket) || !form.reportValidity()) return;
      busy = true; save.disabled = true; status.textContent = l('正在计算并保存…', 'Calculating and saving…');
      try {
        let chart = null;
        if (certainty.value === 'known') {
          const [year, month, day] = date.value.split('-').map(Number), [hour, minute] = time.value.split(':').map(Number);
          const candidates = localToUtcCandidates(year, month, day, hour, minute, timezone.value);
          if (!candidates.length) throw Error('INVALID_BIRTH');
          if (candidates.length > 1 && !occurrence.value) { occurrence.parentElement.hidden = false; status.textContent = l('这个时刻在夏令时回拨中出现两次，请确认第一次或第二次。', 'This time occurs twice during a clock change. Choose earlier or later.'); return; }
          if (candidates[occurrence.value === 'later' ? candidates.length-1 : 0] > Date.now()) throw Error('INVALID_BIRTH');
          const result = await calculateHumanDesign({ name: nickname.value, location: location.value, year, month, day, hour, minute, timezone: timezone.value, timeDisambiguation: occurrence.value || 'earlier' });
          chart = await createHumanDesignProfileSnapshot({ input: { birthDate: date.value, birthTime: time.value, timezone: timezone.value, locationLabel: location.value }, result });
        }
        if (!valid(ticket)) return;
        await repo.save(owner, id, person?.revision || 0, crypto.randomUUID(), cleanPerson({ nickname: nickname.value, relationship: relationship.value, is_self: isSelf, source: source.value,
          birth: { date: date.value, time: time.value, timezone: timezone.value, location: location.value, certainty: certainty.value }, chart, notes: notes.value }));
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
  async function conversation(person, previous = null) {
    const own = people.find(p => p.is_self);
    if (!own) { status.textContent = l('请先建立并确认你的主档案。', 'Create and confirm your own profile first.'); return; }
    invalidate(); const ticket = epoch;
    reset(`${own.nickname} × ${person.nickname}`);
    const controls = el('div', '', { class: 'journal-actions' });
    controls.append(button('← 返回档案', '← Back to profiles', async () => { if (await mayLeave()) await list(); }), button('开启新对话', 'New conversation', async () => { if (await mayLeave()) await conversation(person); })); content.append(controls);
    const pair = el('details', '', { class: 'relationship-context' }); pair.append(el('summary', l('本次参考：我 + ', 'Using: me + ') + person.nickname));
    const summaries = el('div', '', { class: 'journal-list' });
    for (const p of [own, person]) { const section = el('section'); section.append(el('h3', p.nickname), chartSummary(p)); summaries.append(section); }
    pair.append(summaries, el('p', l('只发送双方的类型、策略、权威与人生角色，以及你本次选择的摘录。不会自动发送姓名、出生信息、人物备注或其他人的资料。', 'Only the pair’s type, strategy, authority, profile and selected excerpts are sent. Names, birth details, profile notes and other people are not automatically included.'))); content.append(pair);
    const journalBox = el('details', '', { class: 'relationship-context' }); journalBox.append(el('summary', l('选择日记摘录（可选，最多两篇）', 'Choose journal excerpts (optional, up to two)')));
    const journalList = el('div'); journalBox.append(journalList); content.append(journalBox);
    const selected = new Map();
    const journalLoad = button('读取我的日记', 'Load my journal', async () => {
      const rows = await repo.journals(owner); if (!valid(ticket)) return;
      journalList.replaceChildren(); if (!rows.length) journalList.append(el('p', l('还没有已同步的日记。', 'No synced entries yet.')));
      for (const row of rows) {
        const item = el('div', '', { class: 'relationship-excerpt' });
        const input = consent(item, `${row.entry_date} · ${row.title || row.body.slice(0,24)}`, `${row.entry_date} · ${row.title || row.body.slice(0,24)}`);
        const excerpt = row.body.slice(0,1200); item.append(el('p', excerpt)); input.disabled = !excerpt.trim();
        input.onchange = () => { if (input.checked && selected.size >= 2) { input.checked = false; return; } if (input.checked) selected.set(row.id, { id: row.id, excerpt }); else selected.delete(row.id); }; journalList.append(item);
      }
    }); journalList.append(journalLoad);
    const outdated = previous && (previous.self_id !== own.id || previous.self_revision !== own.revision || previous.person_revision !== person.revision);
    activeThread = previous ? { ...previous, messages: [...previous.messages] } : { id: crypto.randomUUID(), revision: 0, self_id: own.id, person_id: person.id, self_revision: own.revision, person_revision: person.revision, messages: [] };
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
    const question = field(form, '发生了什么？你希望有什么改变？', 'What happened, and what would you like to change?', 'textarea', '', { maxlength: '3000', rows: '4', required: '', placeholder: l('从一件具体的事说起，也说说你的感受和需要…', 'Describe a specific event and how you feel…') });
    question.oninput = () => { dirty = Boolean(question.value.trim()) || Boolean(unsavedThread); };
    const send = el('button', l('和豆豆龙聊聊', 'Talk to Doudoulong'), { type: 'submit', class: 'journal-primary' }); form.append(send);
    const retrySave = button('重新保存这段对话', 'Retry saving this conversation', async () => {
      if (!unsavedThread) return; busy = true;
      try { const saved = await repo.saveConversation(owner, thread, unsavedThread); if (!valid(ticket)) return; Object.assign(thread, saved); unsavedThread = null; dirty = Boolean(question.value.trim()); retrySave.hidden = true; send.disabled = false; status.textContent = l('对话已同步', 'Conversation synced'); }
      finally { if (ticket === epoch) busy = false; }
    }); retrySave.hidden = true; form.append(retrySave);
    content.append(form, el('p', l('发送后由 DeepSeek 生成回应，对话保存到你的私密账号。建议会结合你的描述；人类图只是观察线索，不代表对方真实想法。', 'DeepSeek generates the reply; the conversation is saved privately to your account. Advice uses your account of events. Charts are reflection prompts, not evidence of the other person’s thoughts.')));
    if (outdated) { form.hidden = true; journalBox.hidden = true; status.textContent = l('双方档案已更新。这是旧对话，可阅读；继续聊请开启新对话。', 'The profiles changed. This conversation is read-only; start a new one to continue.'); }
    form.onsubmit = async event => {
      event.preventDefault(); if (busy || unsavedThread || outdated || !valid(ticket) || !form.reportValidity()) return;
      busy = true; send.disabled = true; question.disabled = true;
      const value = question.value.trim(); const before = [...thread.messages];
      try {
        if (!await ensureAIConsent() || !valid(ticket)) return;
        controller = new AbortController(); status.textContent = l('正在认真读你们的故事…', 'Reading your story…');
        const session = await account.client.auth.getSession(); if (!valid(ticket)) return;
        if (!session.data?.session?.access_token) throw Error('SIGN_IN_REQUIRED');
        const access = await chatAccess(); if (!valid(ticket)) return;
        const response = await fetch(`${account.config.apiUrl}/v1/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session.access_token}` },
          body: JSON.stringify({ mode: 'relationship', relationship: { selfId: own.id, personId: person.id, selfRevision: own.revision, personRevision: person.revision, journal: [...selected.values()] }, messages: relationshipMessages(thread.messages, value), ...access }), signal: controller.signal });
        if (!response.ok) { if (response.status === 402) showMembership(); throw Error((await response.json().catch(() => ({}))).error || 'AI_UNAVAILABLE'); }
        if (!valid(ticket)) return;
        const answer = { role: 'assistant', content: '' }; thread.messages.push({ role: 'user', content: value }, answer); drawMessages();
        let completeText = '';
        await readBuerEvents(response.body, (type, data) => { if (valid(ticket) && type === 'delta') { completeText += data.text; answer.content = completeText.length <= 6000 ? completeText : completeText.slice(0,5920) + l('\n（回复较长，已保留前半部分。可以继续追问。）', '\n(Long reply shortened. Ask a follow-up to continue.)'); drawMessages(); } });
        if (!valid(ticket)) return;
        thread.messages = thread.messages.slice(-40); question.value = ''; unsavedThread = crypto.randomUUID(); dirty = true;
        const saved = await repo.saveConversation(owner, thread, unsavedThread);
        if (!valid(ticket)) return; Object.assign(thread, saved); unsavedThread = null; dirty = false; status.textContent = l('对话已同步到你的账号', 'Conversation synced to your account');
      } catch (error) {
        if (!valid(ticket)) return;
        if (!unsavedThread) { thread.messages = before; drawMessages(); }
        retrySave.hidden = !unsavedThread; status.textContent = errorMessage(error);
      } finally { if (ticket === epoch) { controller = null; busy = false; send.disabled = Boolean(unsavedThread); question.disabled = false; } }
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
  function language() { title.textContent = l('关系档案', 'Relationships'); hint.textContent = l('我与家人、同事和伙伴', 'Me, family, colleagues and partners'); if (dialog.open && !dirty && !busy) void list(); }
  document.addEventListener('buer:language', language); language();
  document.addEventListener('buer:relationships', () => void open());
  account?.subscribe(user => { const next = user?.id || null; if (owner === next) return; invalidate(); owner = next; people = []; content.replaceChildren(); status.textContent = ''; if (dialog.open) void list(); });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  const viewport = () => { const v = window.visualViewport, follow = v && matchMedia('(max-width:760px)').matches && Math.abs(v.scale-1)<.01; dialog.style.setProperty('--journal-viewport-height', follow ? `${v.height}px` : '100dvh'); dialog.style.setProperty('--journal-viewport-top', follow ? `${v.offsetTop}px` : '0px'); };
  window.visualViewport?.addEventListener('resize', viewport); window.visualViewport?.addEventListener('scroll', viewport); viewport();
  return { open };
}
