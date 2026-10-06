export const MOODS = ['', 'calm', 'happy', 'tired', 'sad', 'anxious', 'mixed'];
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function validateEntry(value) {
  if (!value || typeof value.title !== 'string' || value.title.length > 120 ||
      typeof value.body !== 'string' || value.body.length > 20000 || !MOODS.includes(value.mood) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.entry_date) ||
      new Date(`${value.entry_date}T12:00:00Z`).toISOString().slice(0, 10) !== value.entry_date) throw new Error('INVALID_ENTRY');
  return { title: value.title, body: value.body, mood: value.mood, entry_date: value.entry_date };
}

export function indexedJournalCache(indexedDB = globalThis.indexedDB) {
  let database;
  async function db() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('buer-private-journal-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('accounts');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));
    });
    return database;
  }
  async function run(owner, mode, value) {
    const connection = await db();
    return new Promise((resolve, reject) => {
      const transaction = connection.transaction('accounts', mode === 'get' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('accounts');
      const request = mode === 'get' ? store.get(owner) : mode === 'remove' ? store.delete(owner) : store.put(value, owner);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = transaction.onerror = () => reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));
    });
  }
  return { get: owner => run(owner, 'get'), set: (owner, value) => run(owner, 'set', value), remove: owner => run(owner, 'remove') };
}

export function journalRepository(account) {
  const { client } = account;
  const assertOwner = owner => { if (account.user?.id !== owner) throw new Error('ACCOUNT_CHANGED'); };
  return {
    async list(owner) {
      const rows = [];
      for (let from = 0; ; from += 200) {
        assertOwner(owner);
        const { data, error } = await client.from('buer_journal_entries').select('*').eq('user_id', owner)
          .order('id').range(from, from + 199);
        assertOwner(owner);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 200) return rows;
      }
    },
    async save(owner, entry, deleting = false) {
      assertOwner(owner);
      const args = { entry_id: entry.id, expected_revision: entry.revision, mutation: entry.mutation_id };
      if (!deleting) Object.assign(args, { entry_title: entry.title, entry_body: entry.body,
        entry_mood: entry.mood, journal_date: entry.entry_date });
      const { data, error } = await client.rpc(deleting ? 'buer_delete_journal' : 'buer_save_journal', args);
      assertOwner(owner);
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
  };
}

// A single identity epoch guards every async read/write. Cache keys never come from form fields.
export function createJournalStore({ repository, cache, uuid = () => crypto.randomUUID(), onChange = () => {} }) {
  let owner = null, epoch = 0, records = new Map(), busy = null, status = 'locked', failure = null;
  let persistQueue = Promise.resolve();
  function snapshot() { return { owner, status, failure, entries: [...records.values()].filter(x => !x.deleting && !x.deleted_at)
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.updated_at.localeCompare(a.updated_at)) }; }
  const emit = () => onChange(snapshot());
  function persist() {
    const key = owner, values = structuredClone([...records.values()]);
    if (!key) return Promise.resolve();
    const operation = persistQueue.catch(() => {}).then(() => cache.set(key, values));
    persistQueue = operation;
    return operation;
  }
  async function refresh() {
    const key = owner, ticket = epoch;
    if (!key) return;
    const remote = await repository.list(key);
    if (ticket !== epoch) return;
    const merged = new Map(remote.map(row => [row.id, row]));
    for (const row of records.values()) if (row.pending) merged.set(row.id, row);
    records = merged;
    await persist();
    if (ticket === epoch) emit();
  }
  async function flush() {
    if (!owner) throw new Error('SIGN_IN_REQUIRED');
    if (busy) return busy;
    const ticket = epoch, key = owner;
    const operation = (async () => {
      status = 'syncing'; failure = null; emit();
      try {
        await persistQueue;
        while (ticket === epoch) {
          const next = [...records.values()].find(row => row.pending && !row.conflict);
          if (!next) break;
          const sent = structuredClone(next);
          let saved;
          try { saved = await repository.save(key, sent, sent.deleting); }
          catch (error) {
            if (ticket !== epoch) return;
            if (error.code === '40001') {
              records.set(sent.id, { ...records.get(sent.id), conflict: true });
              await persist();
            }
            throw error;
          }
          if (ticket !== epoch) return;
          const latest = records.get(sent.id);
          if (latest?.mutation_id === sent.mutation_id) records.set(sent.id, saved);
          else if (latest) records.set(sent.id, { ...latest, revision: saved.revision });
          await persist();
        }
        if (ticket !== epoch) return;
        if ([...records.values()].some(row => row.conflict)) throw Object.assign(new Error('CONFLICT'), { code: '40001' });
        await refresh();
        if (ticket === epoch) { status = 'synced'; emit(); }
      } catch (error) {
        if (ticket === epoch) { status = error.code === '40001' ? 'conflict' : 'offline'; failure = error; emit(); }
        throw error;
      } finally { if (ticket === epoch) busy = null; }
    })();
    busy = operation;
    return operation;
  }
  return {
    snapshot, flush, refresh,
    async setUser(id) {
      const ticket = ++epoch;
      owner = id || null; records = new Map(); busy = null; failure = null;
      status = owner ? 'loading' : 'locked'; emit();
      if (!owner) return;
      try {
        const saved = await cache.get(id);
        if (ticket !== epoch) return;
        records = new Map((saved || []).map(row => [row.id, row]));
        status = 'local'; emit();
        await flush();
      } catch (error) { if (ticket === epoch) { failure = error; status = 'offline'; emit(); } }
    },
    async edit(id, value) {
      if (!owner) throw new Error('SIGN_IN_REQUIRED');
      if (status === 'loading') throw new Error('ACCOUNT_LOADING');
      const ticket = epoch;
      const fields = validateEntry(value), previous = records.get(id);
      const entry = { ...previous, ...fields, id: id || uuid(), revision: previous?.revision || 0,
        mutation_id: uuid(), updated_at: new Date().toISOString(), pending: true };
      records.set(entry.id, entry); status = 'saving'; emit();
      try { await persist(); if (ticket === epoch && !busy) { status = 'local'; emit(); } }
      catch (error) { if (ticket === epoch) { status = 'storage-error'; failure = error; emit(); } throw error; }
      return entry.id;
    },
    async remove(id) {
      const row = records.get(id); if (!row) return;
      await flush(); // resolve an uncertain create before deleting, including response-lost retries
      const latest = records.get(id);
      records.set(id, { ...latest, pending: true, deleting: true, mutation_id: uuid() });
      await persist(); return flush();
    },
    async keepConflictCopy(id) {
      const row = records.get(id); if (!row?.conflict) return;
      const newId = uuid();
      records.set(newId, { ...row, id: newId, revision: 0, mutation_id: uuid(), conflict: false, deleting: false, pending: true });
      records.delete(id);
      await persist(); emit();
      await flush(); return newId;
    },
    async clearForSignOut() {
      const key = owner;
      await flush();
      await persistQueue;
      // Lock first; a late network response cannot restore the previous account.
      ++epoch; owner = null; records = new Map(); busy = null; status = 'locked'; emit();
      await cache.remove(key);
    },
    async clearDeletedAccount() {
      const key = owner;
      ++epoch; owner = null; records = new Map(); busy = null; status = 'locked'; emit();
      await persistQueue.catch(() => {});
      if (key) await cache.remove(key);
    },
  };
}
