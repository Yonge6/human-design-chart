import test from 'node:test';
import assert from 'node:assert/strict';
import { createJournalStore, validateEntry } from '../src/services/buer-journal.js';
import { readAuthCallback, accountConfig } from '../src/services/buer-account.js';
import { nativeAuthDiagnostic, workspaceConflictSummary, workspaceSyncStatus } from '../src/app/buer-journal.js';
const value = { title: 'A private day', body: 'Only mine', mood: 'calm', entry_date: '2026-10-05' };
const clone = value => structuredClone(value);
const delay = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
function fixture() {
  const disk = new Map(), remote = new Map(); let id = 0;
  const cache = { get: async owner => clone(disk.get(owner)), set: async (owner, rows) => disk.set(owner, clone(rows)), remove: async owner => disk.delete(owner) };
  const repository = {
    async list(owner) { return clone([...remote.values()].filter(x => x.user_id === owner)); },
    async save(owner, row, deleting) {
      const current = remote.get(row.id);
      if (current?.mutation_id === row.mutation_id && current.user_id === owner) return clone(current);
      if ((current && current.user_id !== owner) || (current?.revision || 0) !== row.revision) throw Object.assign(new Error('conflict'), { code: '40001' });
      const saved = { ...row, pending: false, user_id: owner, revision: row.revision + 1,
        ...(deleting ? { body: '', title: '', deleted_at: 'now' } : {}) };
      remote.set(row.id, saved); return clone(saved);
    },
  };
  const store = createJournalStore({ cache, repository, uuid: () => `id-${++id}` });
  return { store, cache, disk, remote, repository };
}
test('date and length validation rejects impossible dates and unsupported moods', () => {
  assert.throws(() => validateEntry({ ...value, entry_date: '2026-02-30' }));
  assert.throws(() => validateEntry({ ...value, body: 'x'.repeat(20001) }));
  assert.throws(() => validateEntry({ ...value, mood: 'diagnosis' }));
});
test('native OAuth only accepts exact Buer callback with code', () => {
  assert.equal(readAuthCallback('buerwithin://auth/callback?code=abc'), 'abc');
  assert.equal(readAuthCallback('buerwithin://evil/callback?code=abc'), null);
  assert.equal(readAuthCallback('https://auth/callback?code=abc'), null);
  assert.equal(readAuthCallback('buerwithin://auth/callback#error=abc'), null);
  assert.equal(accountConfig({}), null);
});
test('native development builds show only bounded auth diagnostic codes', () => {
  assert.equal(nativeAuthDiagnostic(new Error('AUTH_CALLBACK_ACCESS_DENIED'), { native: true, environment: 'development' }), 'AUTH_CALLBACK_ACCESS_DENIED');
  assert.equal(nativeAuthDiagnostic(new Error('code verifier mismatch'), { native: true, environment: 'development' }), 'PKCE_VERIFIER_FAILED');
  assert.equal(nativeAuthDiagnostic(new Error('AUTH_CALLBACK_ACCESS_DENIED'), { native: false, environment: 'development' }), '');
  assert.equal(nativeAuthDiagnostic(new Error('AUTH_CALLBACK_ACCESS_DENIED'), { native: true, environment: 'production' }), '');
});
test('preserved workspace versions use content names and valid content times, never internal record IDs', () => {
  const chat = workspaceConflictSummary({ kind: 'chat', recordId: 'private-internal-id', payload: {
    messages: [{ role: 'assistant', content: 'A reply' }, { role: 'user', content: '  我想找到\n适合自己的节奏  ' }],
    date: '2026-10-13T12:00:00Z',
  } });
  assert.equal(chat.title, '我想找到 适合自己的节奏');
  assert.equal(chat.type, '对话记录');
  assert.match(chat.time, /2026/);
  assert.ok(!JSON.stringify(chat).includes('private-internal-id'));
  const manual = workspaceConflictSummary({ kind: 'manual', recordId: 'manual-id', payload: { input: { name: '小林' }, createdAt: 'invalid-date' } });
  assert.equal(manual.title, '小林的人生说明书');
  assert.equal(manual.time, '时间未记录');
  assert.equal(workspaceConflictSummary({ kind: 'action', recordId: 'action-id', payload: { title: '每周留半天休息', due: '2026-12-31' } }).time, '时间未记录');
  assert.equal(workspaceConflictSummary({ kind: 'answer', payload: { value: 'My next step' } }, 'en').title, 'My next step');
  assert.equal(workspaceConflictSummary({ kind: 'chat', payload: { messages: {} } }).title, '对话记录');
});
test('account sync feedback distinguishes connection failure, queued edits and completed sync', () => {
  assert.match(workspaceSyncStatus({ status: 'offline', pending: 2 }), /检查网络.*本机内容仍保留/);
  assert.match(workspaceSyncStatus({ status: 'pending', pending: 2 }), /2 项等待同步/);
  assert.equal(workspaceSyncStatus({ status: 'synced', pending: 0 }), '已同步到账号');
  assert.match(workspaceSyncStatus({ status: 'synced', pending: 1 }), /等待同步/);
  assert.equal(workspaceSyncStatus({ status: 'syncing', pending: 2 }, 'en'), 'Syncing…');
  assert.match(workspaceSyncStatus({ status: 'offline', pending: 0 }, 'en'), /could not finish/);
});
test('accounts have isolated entries, local drafts and server writes', async () => {
  const { store, disk } = fixture();
  await store.setUser('A'); const id = await store.edit(null, value); await store.flush();
  assert.equal(store.snapshot().entries[0].id, id);
  await store.clearForSignOut(); assert.equal(disk.has('A'), false);
  await store.setUser('B'); assert.deepEqual(store.snapshot().entries, []);
  await store.edit(null, { ...value, body: 'B only' }); await store.flush();
  await store.setUser('A'); assert.equal(store.snapshot().entries[0].body, 'Only mine');
});
test('a response from the old account cannot reappear after switching', async () => {
  const { store, repository } = fixture(); await store.setUser('A'); await store.edit(null, value);
  const gate = delay(); const save = repository.save;
  repository.save = async (...args) => { await gate.promise; return save(...args); };
  const inFlight = store.flush(); await Promise.resolve(); await store.setUser('B');
  gate.resolve(); await inFlight;
  assert.equal(store.snapshot().owner, 'B'); assert.deepEqual(store.snapshot().entries, []);
});
test('offline edits survive reopening and retry without duplication', async () => {
  const { store, cache, repository, remote } = fixture(); await store.setUser('A');
  const save = repository.save; repository.save = async () => { throw new Error('offline'); };
  await store.edit(null, value); await assert.rejects(store.flush());
  const second = createJournalStore({ cache, repository }); await second.setUser('A');
  assert.equal(second.snapshot().entries[0].body, value.body);
  repository.save = save; await second.flush(); assert.equal(remote.size, 1);
});
test('lost successful response retries the mutation idempotently', async () => {
  const { store, repository, remote } = fixture(); await store.setUser('A'); await store.edit(null, value);
  const save = repository.save; let first = true;
  repository.save = async (...args) => { const row = await save(...args); if (first) { first = false; throw new Error('response lost'); } return row; };
  await assert.rejects(store.flush()); await store.flush();
  assert.equal(remote.size, 1); assert.equal([...remote.values()][0].revision, 1);
});
test('typing during a save persists the latest text at the next revision', async () => {
  const { store, repository } = fixture(); await store.setUser('A'); const id = await store.edit(null, value);
  const gate = delay(), started = delay(); const save = repository.save; let first = true;
  repository.save = async (...args) => { if (first) { first = false; started.resolve(); await gate.promise; } return save(...args); };
  const inFlight = store.flush(); await started.promise;
  await store.edit(id, { ...value, body: 'latest' }); gate.resolve(); await inFlight;
  assert.equal(store.snapshot().entries[0].body, 'latest'); assert.equal(store.snapshot().entries[0].revision, 2);
});
test('conflicts preserve both versions and offer a separate copy', async () => {
  const { store, remote } = fixture(); await store.setUser('A'); const id = await store.edit(null, value); await store.flush();
  remote.set(id, { ...remote.get(id), body: 'other device', revision: 2 });
  await store.edit(id, { ...value, body: 'my edits' }); await assert.rejects(store.flush());
  assert.equal(store.snapshot().status, 'conflict'); assert.equal(remote.get(id).body, 'other device');
  await store.keepConflictCopy(id);
  assert.deepEqual(store.snapshot().entries.map(x => x.body).sort(), ['my edits', 'other device']);
});
test('failed local writes cannot be reported as saved', async () => {
  const { store, cache } = fixture(); await store.setUser('A'); cache.set = async () => { throw new Error('quota'); };
  await assert.rejects(store.edit(null, value)); assert.equal(store.snapshot().status, 'storage-error');
  assert.equal(store.snapshot().entries[0].body, value.body);
});
test('deleting an entry removes it from both clients', async () => {
  const { store, cache, repository } = fixture(); await store.setUser('A'); const id = await store.edit(null, value); await store.flush();
  await store.remove(id); const second = createJournalStore({ cache, repository }); await second.setUser('A');
  assert.deepEqual(second.snapshot().entries, []);
});

test('editing is blocked until account cache hydration completes', async () => {
  const { store, cache } = fixture(); const gate = delay();
  cache.get = () => gate.promise;
  const loading = store.setUser('A');
  await assert.rejects(store.edit(null, value), /ACCOUNT_LOADING/);
  gate.resolve([]); await loading;
});

test('local saved status is not emitted before durable storage succeeds', async () => {
  const { store, cache } = fixture(); await store.setUser('A'); const gate = delay();
  const save = cache.set; cache.set = async (...args) => { await gate.promise; return save(...args); };
  const editing = store.edit(null, value);
  assert.equal(store.snapshot().status, 'saving');
  gate.resolve(); await editing; assert.equal(store.snapshot().status, 'local');
});

test('account configuration never reuses the legacy anonymous chart service', () => {
  assert.equal(accountConfig({ supabaseUrl: 'https://legacy.supabase.co', supabasePublishableKey: 'legacy' }), null);
  const config = accountConfig({ buerAccountUrl: 'https://buer.supabase.co', buerAccountPublishableKey: 'public', buerAuthProviders: 'email, google,unsupported' });
  assert.deepEqual(config.providers, ['google']);
});
