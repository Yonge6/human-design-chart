import { createAccount } from '../services/buer-account.js';
import {workspace,onWorkspaceChange} from '../services/buer-workspace.js';
import { loadingPreview } from './buer-loading.js';
import { createJournalStore, indexedJournalCache, journalRepository, localDate } from '../services/buer-journal.js';

const copy = {
  zh: { journal: '见己日记', hint: '记录生活，慢慢认识自己', account: '我的账号', accountHint: 'H5 与 App，同一个你',
    kicker: '记录当下，也看见成长', title: '把今天，留给未来的自己。', subtitle: '登录同一账号，在 H5 和 App 接着写。日记会沉淀进成长档案，并在生成个人与关系解读时作为背景参考。',
    login: '登录，开始记录', loginHint: '首次登录会创建不二账号。请在 H5 和 App 使用同一种登录方式。',
    unconfigured: '账号同步服务正在准备中，暂时无法登录。', apple: '通过 Apple 登录', google: '通过 Google 登录',
    switch: '切换账号', logout: '退出登录', export: '导出日记', deleteAccount: '删除账号与云端资料',
    new: '写一篇', search: '搜索我的日记', date: '日记日期', filterDate: '按日期筛选', clearFilter: '全部日期',
    titleLabel: '标题（选填）', bodyLabel: '今天想记下什么？', mood: '此刻的心情（选填）',
    moods: ['不选择', '平静', '开心', '疲惫', '低落', '焦虑', '说不清'],
    empty: '从一句话开始，也很好。', noResults: '没有符合条件的日记。', untitled: '无标题日记',
    delete: '删除这篇日记', back: '返回列表', close: '关闭', retry: '同步',
    locked: '请先登录', loading: '正在读取日记…', syncing: '正在同步…', synced: '已同步到你的账号',
    local: '已保存在本机，等待同步', offline: '尚未同步，请检查网络后重试', 'storage-error': '本机保存失败，请先复制正文，勿关闭页面',
    conflict: '另一台设备修改了这篇日记。你的编辑已保留，可另存一篇后继续。', keepCopy: '将我的编辑另存一篇',
    cancel: '取消', confirm: '确认', deleteTitle: '删除这篇日记？', deleteNote: '同步后，这篇日记会从你的所有设备移除，无法恢复。',
    deleteAccountTitle: '删除不二账号与云端资料？', deleteAccountNote: '此操作无法恢复，将删除云端普通对话、成长档案、说明书、日记、人物档案、关系对话和相处指南。请先导出需要保留的内容。Apple 登录用户确认后需要再次验证身份，以撤销 Apple 授权。App Store 订阅不会自动取消；此设备上该账号的缓存也会移除；其他离线设备需联网同步删除结果。输入 DELETE 确认。',
    leaveNote: '完成同步后退出，账号内容立即隐藏；云端内容保留。普通对话、档案与说明书的缓存仅在重新登录同一账号后显示。',
    error: '操作暂未完成，请检查网络后重试。输入内容仍保留。', providerError: '登录没有完成，请重试或选择另一种登录方式。',
    appleReauthError: '需要重新通过 Apple 登录后才能撤销授权并删除账号。请使用 Apple 登录后立即重试。',
    storageBoundary: '普通对话、完整成长档案、人生说明书、日记、人物档案、关系对话与相处指南都会同步到账号。登录后自动合并本机旧内容；生成个人与关系解读时，AI 会结合这些资料理解你的背景。',
    pendingLeave: '请先完成日记同步或处理冲突，再切换账号。', saving: '正在保存…',
  },
  en: { journal: 'Private journal', hint: 'Keep a moment. Get to know yourself.', account: 'My account', accountHint: 'One account on web and App',
    kicker: 'Record today. Notice your growth.', title: 'Keep today for your future self.', subtitle: 'Continue on web and App with the same account. Journal entries become part of your growth profile and provide context for personal and relationship guidance.',
    login: 'Sign in to start writing', loginHint: 'Your first sign-in creates a Buer account. Use the same sign-in method on web and App.',
    unconfigured: 'Account sync is being prepared. Sign-in is not available yet.', apple: 'Sign in with Apple', google: 'Sign in with Google',
    switch: 'Switch account', logout: 'Sign out', export: 'Export journal', deleteAccount: 'Delete account and cloud data',
    new: 'Write an entry', search: 'Search my journal', date: 'Entry date', filterDate: 'Filter by date', clearFilter: 'All dates',
    titleLabel: 'Title (optional)', bodyLabel: 'What would you like to remember?', mood: 'How you feel (optional)',
    moods: ['Not selected', 'Calm', 'Happy', 'Tired', 'Low', 'Anxious', 'Mixed'], empty: 'A single sentence is a lovely start.', noResults: 'No matching entries.', untitled: 'Untitled entry',
    delete: 'Delete entry', back: 'Back to entries', close: 'Close', retry: 'Sync', locked: 'Please sign in', loading: 'Loading journal…', syncing: 'Syncing…', synced: 'Synced to your account',
    local: 'Saved on this device, awaiting sync', offline: 'Not synced yet. Check your connection and retry.', 'storage-error': 'Local save failed. Copy your text before closing.',
    conflict: 'Another device changed this entry. Your edits are safe. Save them as a separate entry to continue.', keepCopy: 'Save my edits as a new entry',
    cancel: 'Cancel', confirm: 'Confirm', deleteTitle: 'Delete this entry?', deleteNote: 'After syncing, this entry will be removed from all your devices. This cannot be undone.',
    deleteAccountTitle: 'Delete your Buer account and cloud data?', deleteAccountNote: 'This permanently removes all cloud chats, growth profiles, manuals, journals, people and relationship guides. Export anything you want to keep first. Apple users will be asked to authenticate again so that Apple authorization can be revoked. App Store subscriptions are not automatically cancelled; this account’s cache on this device is removed; other offline devices must reconnect to receive deletion. Type DELETE to confirm.',
    leaveNote: 'Sync and sign out. Account content is hidden immediately; cloud records remain. Cached chats, profiles and manuals reappear only after signing in to the same account.', error: 'Could not complete this action. Check your connection and try again. Your text is kept.',
    providerError: 'Sign-in did not complete. Try again or choose another method.', appleReauthError: 'Sign in with Apple again before deleting the account so that Apple authorization can be revoked, then retry immediately.', storageBoundary: 'Chats, complete growth profiles, Life Manuals, journals, people, relationship conversations and guides all sync with this account. Existing device content merges automatically after sign-in. AI uses this context when creating personal and relationship guidance.',
    pendingLeave: 'Sync your journal and resolve conflicts before switching accounts.', saving: 'Saving…',
  },
};

function element(tag, attributes = {}, text = '') {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') node.className = value;
    else node.setAttribute(key, value);
  }
  if (text) node.textContent = text;
  return node;
}

export async function initBuerJournal({ getLanguage, accountFactory = createAccount, cache = indexedJournalCache() }) {
  const t = key => copy[getLanguage() === 'en' ? 'en' : 'zh'][key];
  let account = null, store = null, currentId = null, userId = null, timer = null, editing = false, pendingEdit = Promise.resolve();
  let state = { status: 'locked', entries: [] }, entryTrigger = null, inlineHost = null, mode = 'journal', busy = false;
  let filterQuery = '', filterDate = '';
  const dialog = element('dialog', { className: 'journal-dialog', 'aria-labelledby': 'journal-heading' });
  const shell = element('div', { className: 'journal-shell' });
  const toolbar = element('header', { className: 'journal-toolbar' });
  const heading = element('h2', { id: 'journal-heading' });
  const close = element('button', { type: 'button', className: 'journal-close' }, '×');
  toolbar.append(heading, close);
  const content = element('div', { className: 'journal-content' });
  const status = element('p', { className: 'journal-status', role: 'status', 'aria-live': 'polite' });
  shell.append(toolbar, content, status); dialog.append(shell); document.body.append(dialog);

  function button(label, action, className = '') {
    const b = element('button', { type: 'button', className }); b.textContent = label;
    b.onclick = () => { if (!busy) Promise.resolve().then(action).catch(showError); };
    return b;
  }
  function showError(error) { status.textContent = error?.code === '40001' ? t('conflict') : error?.message === 'LOCAL_STORAGE_UNAVAILABLE' ? t('storage-error') : t('error'); }
  function field(label, type, value, attributes = {}) {
    const wrapper = element('label', { className: 'journal-field' });
    wrapper.append(element('span', {}, label));
    const input = element(type === 'textarea' ? 'textarea' : 'input', { ...(type === 'textarea' ? {} : { type }), ...attributes });
    input.value = value || ''; wrapper.append(input); return { wrapper, input };
  }
  function signedIn() { return Boolean(account?.user && store && userId === account.user.id && state.owner === userId); }
  function drawState(next) {
    state = next;
    status.textContent = t(next.status) || '';
    const conflict = content.querySelector('.journal-conflict');
    if (conflict) conflict.hidden = !next.entries.find(row => row.id === currentId)?.conflict;
    if (!editing && (dialog.open || inlineHost?.isConnected) && signedIn() && mode === 'journal') render();
  }
  async function flush() {
    clearTimeout(timer); await pendingEdit;
    if (signedIn()) await store.flush();
  }
  async function open(next = 'journal', trigger) {
    await pendingEdit.catch(() => {});
    detachInline();
    if (mode !== next) { editing = false; currentId = null; }
    mode = next; entryTrigger = trigger || document.activeElement;
    render(); if (!dialog.open) dialog.showModal();
    if (signedIn()) void flush().catch(showError);
  }
  function exit() {
    void flush().catch(() => {}); dialog.close(); entryTrigger?.focus({ preventScroll: true });
    const host = document.querySelector('#growthJournalInline');
    if (host && document.body.dataset.workspace === 'growth') void mountInline(host);
  }
  close.onclick = exit;
  dialog.addEventListener('cancel', event => { event.preventDefault(); exit(); });

  const nav = document.querySelector('#drawerHome .drawer-nav');
  function navEntry(key, hint, next, icon) {
    const b = button('', () => open(next, b));
    const image = element('span', { className: 'drawer-nav-icon' });
    image.append(element('img', { src: `assets/companion-icon-${icon}.svg`, alt: '', width: '48', height: '48', 'aria-hidden': 'true' }));
    const label = element('span'); label.append(element('strong'), element('small'));
    b.append(image, label, element('span', { className: 'drawer-chevron', 'aria-hidden': 'true' }, '›'));
    nav?.prepend(b);
    return () => { b.querySelector('strong').textContent = t(key); b.querySelector('small').textContent = t(hint); };
  }
  const refreshAccountEntry = navEntry('account', 'accountHint', 'account', 'account');
  document.addEventListener('buer:journal', event => void open(event.detail?.mode || 'journal', event.detail?.trigger));
  function detachInline(requestedHost) {
    if (!inlineHost || (requestedHost && requestedHost !== inlineHost)) return;
    shell.append(content, status); inlineHost = null;
  }
  async function mountInline(host) {
    if (!host || dialog.open) return;
    await pendingEdit.catch(() => {});
    if (!host.isConnected) return;
    inlineHost = host; mode = 'journal'; editing = false; currentId = null;
    host.replaceChildren(content, status); render();
    if (signedIn()) void flush().catch(showError);
  }
  document.addEventListener('buer:journal-inline', event => void mountInline(event.detail?.host));
  document.addEventListener('buer:journal-inline-unmount', event => detachInline(event.detail?.host));

  function renderLogin() {
    content.append(element('span', { className: 'journal-kicker' }, t('kicker')),
      element('h3', {}, t('login')), element('p', {}, t('subtitle')));
    if (!account || !account.config.providers.length) { content.append(element('p', { className: 'journal-notice' }, t('unconfigured'))); return; }
    content.append(element('p', {}, t('loginHint')));
    for (const provider of ['apple', 'google']) if (account.config.providers.includes(provider)) {
      content.append(button(t(provider), async () => {
        busy = true;
        try { await account.signIn(provider); }
        catch { status.textContent = t('providerError'); }
        finally { busy = false; }
      }, 'journal-provider'));
    }
  }
  function confirmAction(title, note, action, typed = false) {
    const confirmation = element('dialog', { className: 'journal-confirm', 'aria-label': title });
    confirmation.append(element('h3', {}, title), element('p', {}, note));
    const input = element('input', { type: 'text', 'aria-label': 'DELETE', autocomplete: 'off' });
    if (typed) confirmation.append(input);
    const actions = element('div', { className: 'journal-actions' });
    const cancel = button(t('cancel'), () => confirmation.close());
    const proceed = button(t('confirm'), async () => {
      proceed.disabled = true; cancel.disabled = true;
      try { await action(); confirmation.close(); }
      catch (error) {
        confirmation.querySelector('[role="alert"]')?.remove();
        confirmation.append(element('p', { role: 'alert' }, t(error?.message === 'APPLE_REAUTH_REQUIRED' ? 'appleReauthError' : 'error')));
      } finally { proceed.disabled = typed && input.value !== 'DELETE'; cancel.disabled = false; }
    }, 'journal-primary');
    if (typed) { proceed.disabled = true; input.oninput = () => { proceed.disabled = input.value !== 'DELETE'; }; }
    actions.append(cancel, proceed); confirmation.append(actions); document.body.append(confirmation);
    confirmation.addEventListener('close', () => confirmation.remove(), { once: true }); confirmation.showModal(); cancel.focus();
  }
  async function exportJournal() {
    await flush();
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries: state.entries.map(({ id, title, body, mood, entry_date, created_at, updated_at }) => ({ id, title, body, mood, entry_date, created_at, updated_at })) }, null, 2);
    const native = globalThis.Capacitor?.Plugins?.PlutoNative;
    if (globalThis.Capacitor?.isNativePlatform?.() && native) {
      await native.exportGrowthProfile({ json: data, filename: `buer-journal-${localDate()}.json` }); return;
    }
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = element('a', { href: url, download: `buer-journal-${localDate()}.json` }); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderAccount() {
    content.append(element('span', { className: 'journal-kicker' }, t('account')),
      element('h3', {}, account.user.email || account.user.user_metadata?.full_name || t('account')),
      element('p', {}, t('storageBoundary')));
    const actions = element('div', { className: 'journal-account-actions' });
    for (const action of ['switch', 'logout']) actions.append(button(t(action), () => confirmAction(t(action), t('leaveNote'), async () => {
      try { await flush(); await workspace().sync();if(workspace().state.pending)throw Error('PENDING_WORKSPACE');await store.clearForSignOut(); await account.signOut(); }
      catch (error) { if (account.user?.id === userId) await store.setUser(userId); throw error; }
      editing = false; currentId = null; render();
      if (action === 'logout') exit();
    })));
    actions.append(button(t('export'), exportJournal));
    const zh=getLanguage()!=='en';
    actions.append(button(zh?'同步全部内容':'Sync all content',async()=>{await workspace().sync();await flush();render();}));
    actions.append(button(zh?'导出普通对话、成长档案和说明书（含待同步及冲突版本）':'Export chats, growth & manuals (including pending edits and conflicts)',async()=>{
      const json=JSON.stringify({version:1,owner:workspace().owner,exportedAt:new Date().toISOString(),...workspace().values()},null,2);
      const native=globalThis.Capacitor?.Plugins?.PlutoNative;
      if(globalThis.Capacitor?.isNativePlatform?.()&&native){await native.exportGrowthProfile({json,filename:'buer-workspace.json'});return;}
      const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));element('a',{href:url,download:'buer-workspace.json'}).click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }));
    const syncState=element('p',{className:'workspace-sync-status',role:'status'});content.append(syncState);updateWorkspaceStatus();
    const conflicts=workspace().values().conflicts;
    for(const row of conflicts){const details=element('details');details.append(element('summary',{},(zh?'保留的冲突版本：':'Preserved version: ')+row.kind+' · '+row.recordId));details.append(element('pre',{},JSON.stringify(row.payload,null,2)));details.append(button(zh?'恢复这个版本':'Restore this version',()=>confirmAction(zh?'恢复这个版本？':'Restore this version?',zh?'当前版本也会保留为可恢复副本。':'The current version will also be preserved.',async()=>{await workspace().restore(row.id);render();})));content.append(details);}
    actions.append(button(t('deleteAccount'), () => confirmAction(t('deleteAccountTitle'), t('deleteAccountNote'), async () => {
      await flush();
      // Hold store reference while Auth deletion fires the signed-out callback.
      const previous = store;
      const deletedOwner=userId;
      try { await previous.clearForSignOut(); await account.deleteAccount(); await workspace().removeAccount(deletedOwner);localStorage.removeItem(`buer:growth-drafts:${deletedOwner}`);localStorage.removeItem(`buer:chat-draft:${deletedOwner}`); }
      catch (error) { if (account.user?.id === userId) await previous.setUser(userId); throw error; }
      editing = false; currentId = null; render();
    }, true), 'journal-danger'));
    content.append(actions);
  }
  function updateWorkspaceStatus(){
    const node=content.querySelector('.workspace-sync-status');if(!node)return;
    const s=workspace().state,zh=getLanguage()!=='en';
    node.textContent=(zh?'对话／成长档案／说明书：':'Chats / growth / manuals: ')+(s.status==='synced'&&!s.pending?(zh?'已同步':'Synced'):s.status==='syncing'?(zh?'同步中…':'Syncing…'):(zh?'已存本机，等待同步':'Saved locally, awaiting sync'))+(s.conflicts?(zh?` · ${s.conflicts} 个冲突版本已保留，请重新打开账号页查看。`:` · ${s.conflicts} preserved conflicts. Reopen Account to review.`):'');
  }
  onWorkspaceChange(updateWorkspaceStatus);
  function startEntry(row) {
    editing = true; currentId = row?.id || crypto.randomUUID();
    const value = row || { title: '', body: '', mood: '', entry_date: localDate() };
    content.replaceChildren();
    const actions = element('div', { className: 'journal-actions' });
    actions.append(button(`← ${t('back')}`, async () => { await pendingEdit; editing = false; render(); void flush().catch(showError); }), button(t('retry'), flush));
    content.append(actions);
    const date = field(t('date'), 'date', value.entry_date, { required: '' });
    const title = field(t('titleLabel'), 'text', value.title, { maxlength: '120', autocomplete: 'off' });
    const body = field(t('bodyLabel'), 'textarea', value.body, { maxlength: '20000', rows: '12', placeholder: t('empty') });
    const moodLabel = element('label', { className: 'journal-field' }); moodLabel.append(element('span', {}, t('mood')));
    const mood = element('select');
    ['', 'calm', 'happy', 'tired', 'sad', 'anxious', 'mixed'].forEach((name, i) => mood.append(element('option', { value: name }, t('moods')[i])));
    mood.value = value.mood; moodLabel.append(mood);
    const metadata = element('div', { className: 'journal-metadata' }); metadata.append(date.wrapper, moodLabel);
    const ticket = userId, id = currentId;
    const save = () => {
      if (ticket !== userId || !signedIn()) return;
      if (!body.input.value && !title.input.value && !state.entries.some(x => x.id === id)) return;
      const fields = { title: title.input.value, body: body.input.value, mood: mood.value, entry_date: date.input.value };
      clearTimeout(timer); status.textContent = t('saving');
      pendingEdit = pendingEdit.catch(() => {}).then(() => {
        if (ticket !== userId) return;
        return store.edit(id, fields);
      });
      pendingEdit.catch(showError);
      timer = setTimeout(() => void flush().catch(() => {}), 900);
    };
    [date.input, title.input, body.input, mood].forEach(input => input.addEventListener('input', save));
    const conflict = element('div', { className: 'journal-conflict' }); conflict.hidden = !value.conflict;
    conflict.append(element('p', {}, t('conflict')), button(t('keepCopy'), async () => {
      await pendingEdit;
      const id = await store.keepConflictCopy(currentId); const row = state.entries.find(x => x.id === id);
      if (row) startEntry(row);
    }));
    content.append(metadata, title.wrapper, body.wrapper, conflict,
      button(t('delete'), () => confirmAction(t('deleteTitle'), t('deleteNote'), async () => {
        await pendingEdit; await store.remove(currentId); editing = false; currentId = null; render();
      }), 'journal-danger'));
  }
  function renderList() {
    if (!inlineHost) content.append(element('span', { className: 'journal-kicker' }, t('kicker')), element('h3', {}, t('title')),
      element('p', { className: 'journal-description' }, t('subtitle')));
    const actions = element('div', { className: 'journal-actions' });
    actions.append(button(`＋ ${t('new')}`, () => startEntry(), 'journal-primary'));
    if (!inlineHost) actions.append(button(t('account'), () => open('account')), button(t('retry'), flush));
    content.append(actions);
    const search = field(t('search'), 'search', filterQuery, { autocomplete: 'off' });
    search.wrapper.classList.add('journal-search-field');
    search.wrapper.hidden = !filterQuery;
    const searchToggle = button('', () => {
      const expanded = search.wrapper.hidden;
      search.wrapper.hidden = !expanded;
      searchToggle.setAttribute('aria-expanded', String(expanded));
      if (expanded) search.input.focus();
      else { search.input.value = ''; draw(); }
    }, 'journal-search-toggle');
    searchToggle.setAttribute('aria-label', t('search'));
    searchToggle.setAttribute('title', t('search'));
    searchToggle.setAttribute('aria-expanded', String(!search.wrapper.hidden));
    searchToggle.append(element('i', { className: 'ph ph-magnifying-glass', 'aria-hidden': 'true' }));
    const date = field(t('filterDate'), 'date', filterDate);
    const clearFilter = button(t('clearFilter'), () => {
      date.input.value = ''; search.input.value = ''; search.wrapper.hidden = true;
      searchToggle.setAttribute('aria-expanded', 'false'); draw();
    });
    const filters = element('div', { className: 'journal-filters' }); filters.append(searchToggle, search.wrapper, date.wrapper, clearFilter);
    const list = element('div', { className: 'journal-list' });
    const draw = () => {
      filterQuery = search.input.value; filterDate = date.input.value;
      list.replaceChildren();
      const query = search.input.value.trim().toLowerCase();
      const rows = state.entries.filter(row => (!date.input.value || row.entry_date === date.input.value) && `${row.title}\n${row.body}`.toLowerCase().includes(query));
      if (!rows.length) list.append(element('p', { className: 'journal-empty' }, state.entries.length ? t('noResults') : t('empty')));
      for (const row of rows) {
        const card = button('', () => startEntry(row), 'journal-entry');
        card.append(element('time', { datetime: row.entry_date }, row.entry_date), element('strong', {}, row.title || row.body.slice(0, 32) || t('untitled')),
          element('p', {}, row.body.slice(0, 100)), element('small', {}, row.conflict ? t('conflict') : row.pending ? t('local') : t('synced')));
        list.append(card);
      }
    };
    search.input.oninput = date.input.oninput = draw; draw(); content.append(filters, list);
  }
  function render() {
    heading.textContent = t(mode === 'account' ? 'account' : 'journal'); close.setAttribute('aria-label', t('close'));
    if (editing && signedIn() && mode === 'journal') return;
    content.replaceChildren();
    if (!signedIn()) renderLogin();
    else if (state.status === 'loading') content.append(loadingPreview(t('loading'),[t('journal'),t('hint')]));
    else if (mode === 'account') renderAccount(); else renderList();
  }
  async function languageChanged() {
    await pendingEdit.catch(() => {});
    refreshAccountEntry();
    if (editing) { const row = state.entries.find(x => x.id === currentId); if (row) startEntry(row); }
    render();
  }
  document.addEventListener('buer:language', languageChanged); languageChanged();
  try {
    account = await accountFactory();
    if (account) {
      workspace().bind(account);
      store = createJournalStore({ repository: journalRepository(account), cache, onChange: drawState });
      account.subscribe(user => {
        if (userId === (user?.id || null)) return;
        userId = user?.id || null; editing = false; currentId = null; filterQuery = ''; filterDate = ''; clearTimeout(timer);
        void store.setUser(userId); content.replaceChildren(); render();
      });
    }
    render();
  } catch { status.textContent = t('providerError'); }
  const initialInlineHost = document.querySelector('#growthJournalInline');
  if (initialInlineHost) void mountInline(initialInlineHost);
  window.addEventListener('online', () => { if (signedIn()) void flush().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && signedIn()) void flush().catch(() => {}); });
  window.addEventListener('beforeunload', event => {
    if (state.entries.some(row => row.pending) || state.status === 'storage-error') { event.preventDefault(); event.returnValue = ''; }
  });
  const syncViewport = () => {
    const viewport = window.visualViewport;
    const mobile = matchMedia('(max-width:760px)').matches;
    const follow = mobile && viewport && Math.abs(viewport.scale - 1) < 0.01;
    dialog.style.setProperty('--journal-viewport-height', follow ? `${viewport.height}px` : '100dvh');
    dialog.style.setProperty('--journal-viewport-top', follow ? `${viewport.offsetTop}px` : '0px');
  };
  window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });
  window.addEventListener('resize', syncViewport, { passive: true }); syncViewport();
  return { open, mountInline, get account() { return account; } };
}
