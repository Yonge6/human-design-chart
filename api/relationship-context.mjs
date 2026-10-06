import { UUID, anonymousPerson } from '../src/services/buer-relationships.js';

export function validateRelationshipSelection(value) {
  if (!value || typeof value !== 'object' || Object.keys(value).some(k => !['selfId','personId','selfRevision','personRevision','journal'].includes(k)) ||
    !UUID.test(value.selfId) || !UUID.test(value.personId) || value.selfId === value.personId ||
    !Number.isInteger(value.selfRevision) || value.selfRevision < 1 || !Number.isInteger(value.personRevision) || value.personRevision < 1) throw Error('INVALID_INPUT');
  const journal = value.journal || [];
  if (!Array.isArray(journal) || journal.length > 2 || new Set(journal.map(x => x?.id)).size !== journal.length) throw Error('INVALID_INPUT');
  for (const item of journal) if (!item || Object.keys(item).some(k => !['id','excerpt'].includes(k)) || !UUID.test(item.id) ||
    typeof item.excerpt !== 'string' || !item.excerpt.trim() || item.excerpt.length > 1200) throw Error('INVALID_INPUT');
  return { ...value, journal };
}

export async function loadRelationshipContext(value, authorization, { environment = process.env, fetchImpl = fetch } = {}) {
  const selected = validateRelationshipSelection(value);
  if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)) throw Error('SIGN_IN_REQUIRED');
  const url = environment.BUER_ACCOUNT_URL, key = environment.BUER_ACCOUNT_PUBLISHABLE_KEY;
  if (!url || !key || new URL(url).protocol !== 'https:') throw Error('ACCOUNT_NOT_CONFIGURED');
  const headers = { apikey: key, Authorization: authorization };
  const get = async path => {
    const response = await fetchImpl(`${url.replace(/\/$/, '')}${path}`, { headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'SIGN_IN_REQUIRED' : 'ACCOUNT_UNAVAILABLE');
    return response.json();
  };
  const user = await get('/auth/v1/user');
  if (!UUID.test(user.id)) throw Error('SIGN_IN_REQUIRED');
  // Forward the caller's token, never a service key: RLS also enforces this selection.
  const rows = await get(`/rest/v1/buer_people?select=id,user_id,is_self,source,birth,chart,revision&deleted_at=is.null&id=in.(${selected.selfId},${selected.personId})`);
  const own = rows.find(x => x.id === selected.selfId && x.user_id === user.id && x.is_self);
  const other = rows.find(x => x.id === selected.personId && x.user_id === user.id && !x.is_self);
  if (!own || !other || own.revision !== selected.selfRevision || other.revision !== selected.personRevision) throw Error('PROFILES_CHANGED');
  const journal = [];
  for (const item of selected.journal) {
    const entries = await get(`/rest/v1/buer_journal_entries?select=id,user_id,body&deleted_at=is.null&id=eq.${item.id}`);
    if (entries.length !== 1 || entries[0].user_id !== user.id || !entries[0].body.includes(item.excerpt)) throw Error('JOURNAL_CHANGED');
    journal.push(item.excerpt);
  }
  return { me: anonymousPerson(own), other: anonymousPerson(other), selectedJournalExcerpts: journal };
}
