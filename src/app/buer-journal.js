import { createAccount } from '../services/buer-account.js';
import { loadingPreview } from './buer-loading.js';
import { createJournalStore, indexedJournalCache, journalRepository, localDate } from '../services/buer-journal.js';

const copy = {
  zh: { journal: '见己日记', hint: '记录生活，慢慢认识自己', account: '我的账号', accountHint: 'H5 与 App，同一个你',
    kicker: '只属于你的记录', title: '把今天，留给自己。', subtitle: '日记仅自己可见。登录同一账号，在 H5 和 App 接着写。默认不供 AI 使用；可在「身边的人」明确授权按需参考。',
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
    deleteAccountTitle: '删除不二账号与云端资料？', deleteAccountNote: '此操作无法恢复，将删除云端日记、人物档案和关系对话。请先导出需要保留的日记。Apple 登录用户确认后需要再次验证身份，以撤销 Apple 授权。App Store 订阅不会自动取消；本机原有对话和说明书仍保留。输入 DELETE 确认。',
    leaveNote: '同步后退出当前账号。本机会清除该账号的日记缓存，云端日记仍然保留。',
    error: '操作暂未完成，请检查网络后重试。输入内容仍保留。', providerError: '登录没有完成，请重试或选择另一种登录方式。',
    appleReauthError: '需要重新通过 Apple 登录后才能撤销授权并删除账号。请使用 Apple 登录后立即重试。',
    storageBoundary: '账号同步范围：私密日记、人物档案与关系对话。原有普通对话、成长档案与说明书仍保存在当前设备。',
    pendingLeave: '请先完成日记同步或处理冲突，再切换账号。', saving: '正在保存…',
  },
  en: { journal: 'Private journal', hint: 'Keep a moment. Get to know yourself.', account: 'My account', accountHint: 'One account on web and App',
    kicker: 'A space of your own', title: 'Leave a little room for today.', subtitle: 'Only you can view your journal. Use the same account on web and App. AI access is off by default; authorize relevant excerpts in People if you wish.',
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
    deleteAccountTitle: 'Delete your Buer account and cloud data?', deleteAccountNote: 'This removes cloud journals, people and relationship conversations permanently. Export anything you want to keep first. Apple users will be asked to authenticate again so that Apple authorization can be revoked. App Store subscriptions are not automatically cancelled; existing local chats and manuals remain. Type DELETE to confirm.',
    leaveNote: 'Sync and sign out on this device. Its journal cache will be removed; cloud entries remain.', error: 'Could not complete this action. Check your connection and try again. Your text is kept.',
    providerError: 'Sign-in did not complete. Try again or choose another method.', appleReauthError: 'Sign in with Apple again before deleting the account so that Apple authorization can be revoked, then retry immediately.', storageBoundary: 'Private journals, people and relationship conversations sync with this account. Existing general chats, growth profiles and manuals remain on this device.',
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
  let state = { status: 'locked', entries: [] }, entryTrigger = null, mode = 'journal', busy = false;
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
    if (!editing && dialog.open && signedIn() && mode === 'journal') render();
  }
  async function flush() {
    clearTimeout(timer); await pendingEdit;
    if (signedIn()) await store.flush();
  }
  async function open(next = 'journal', trigger) {
    await pendingEdit.catch(() => {});
    if (mode !== next) { editing = false; currentId = null; }
    mode = next; entryTrigger = trigger || document.activeElement;
    render(); if (!dialog.open) dialog.showModal();
    if (signedIn()) void flush().catch(showError);
  }
  function exit() {
    void flush().catch(() => {}); dialog.close(); entryTrigger?.focus({ preventScroll: true });
  }
  close.onclick = exit;
  dialog.addEventListener('cancel', event => { event.preventDefault(); exit(); });

  const nav = document.querySelector('#drawerHome .drawer-nav');
  function navEntry(key, hint, next, icon) {
    const b = button('', () => open(next, b));
    const image = element('span', { className: 'drawer-nav-icon' });
    image.append(element('i', { className: `ph ${icon}`, 'aria-hidden': 'true' }));
    const label = element('span'); label.append(element('strong'), element('small'));
    b.append(image, label, element('span', { className: 'drawer-chevron', 'aria-hidden': 'true' }, '›'));
    nav?.prepend(b);
    return () => { b.querySelector('strong').textContent = t(key); b.querySelector('small').textContent = t(hint); };
  }
  const refreshJournalEntry = navEntry('journal', 'hint', 'journal', 'ph-notebook');
  const refreshAccountEntry = navEntry('account', 'accountHint', 'account', 'ph-user-circle');

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
      try { await flush(); await store.clearForSignOut(); await account.signOut(); }
      catch (error) { if (account.user?.id === userId) await store.setUser(userId); throw error; }
      editing = false; currentId = null; render();
      if (action === 'logout') exit();
    })));
    actions.append(button(t('export'), exportJournal));
    actions.append(button(t('deleteAccount'), () => confirmAction(t('deleteAccountTitle'), t('deleteAccountNote'), async () => {
      await flush();
      // Hold store reference while Auth deletion fires the signed-out callback.
      const previous = store;
      try { await previous.clearForSignOut(); await account.deleteAccount(); }
      catch (error) { if (account.user?.id === userId) await previous.setUser(userId); throw error; }
      editing = false; currentId = null; render();
    }, true), 'journal-danger'));
    content.append(actions);
  }
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
    content.append(element('span', { className: 'journal-kicker' }, t('kicker')), element('h3', {}, t('title')),
      element('p', { className: 'journal-description' }, t('subtitle')));
    const actions = element('div', { className: 'journal-actions' });
    actions.append(button(`＋ ${t('new')}`, () => startEntry(), 'journal-primary'), button(t('account'), () => { mode = 'account'; render(); }), button(t('retry'), flush));
    content.append(actions);
    const search = field(t('search'), 'search', filterQuery, { autocomplete: 'off' });
    const date = field(t('filterDate'), 'date', filterDate);
    const filters = element('div', { className: 'journal-filters' }); filters.append(search.wrapper, date.wrapper, button(t('clearFilter'), () => { date.input.value = ''; search.input.value = ''; draw(); }));
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
    refreshJournalEntry(); refreshAccountEntry();
    if (editing) { const row = state.entries.find(x => x.id === currentId); if (row) startEntry(row); }
    render();
  }
  document.addEventListener('buer:language', languageChanged); languageChanged();
  try {
    account = await accountFactory();
    if (account) {
      store = createJournalStore({ repository: journalRepository(account), cache, onChange: drawState });
      account.subscribe(user => {
        if (userId === (user?.id || null)) return;
        userId = user?.id || null; editing = false; currentId = null; filterQuery = ''; filterDate = ''; clearTimeout(timer);
        void store.setUser(userId); content.replaceChildren(); render();
      });
    }
    render();
  } catch { status.textContent = t('providerError'); }
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
  return { open, get account() { return account; } };
}
