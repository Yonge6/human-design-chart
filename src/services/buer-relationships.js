import { validateHumanDesignProfileSnapshot } from '../../shared/human-design-profile-contract.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PERSON_SOURCES = ['self', 'permission', 'confirmed', 'guardian'];
export function cleanPerson(value) {
  if (!value || typeof value.nickname !== 'string' || !value.nickname.trim() || value.nickname.length > 60 ||
    typeof value.relationship !== 'string' || !value.relationship.trim() || value.relationship.length > 60 ||
    typeof value.is_self !== 'boolean' || !PERSON_SOURCES.includes(value.source) ||
    value.is_self !== (value.source === 'self') || typeof value.notes !== 'string' || value.notes.length > 2000) throw Error('INVALID_PERSON');
  const birth = value.birth || {};
  if (!['unknown', 'known'].includes(birth.certainty) || typeof birth.date !== 'string' || typeof birth.time !== 'string' ||
    typeof birth.timezone !== 'string' || birth.timezone.length > 80 || typeof birth.location !== 'string' || birth.location.length > 160) throw Error('INVALID_BIRTH');
  if (birth.date && (!/^\d{4}-\d{2}-\d{2}$/.test(birth.date) || new Date(`${birth.date}T12:00:00Z`).toISOString().slice(0, 10) !== birth.date)) throw Error('INVALID_BIRTH');
  if (birth.certainty === 'known') {
    if (!birth.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(birth.time)) throw Error('INVALID_BIRTH');
    try { new Intl.DateTimeFormat('en', { timeZone: birth.timezone }).format(); } catch { throw Error('INVALID_TIMEZONE'); }
  }
  const chart = value.chart || null;
  if (chart && (birth.certainty !== 'known' || !validateHumanDesignProfileSnapshot(chart).valid ||
    chart.input.birthDate !== birth.date || chart.input.birthTime !== birth.time || chart.input.timezone !== birth.timezone)) throw Error('INVALID_CHART');
  return { nickname: value.nickname.trim(), relationship: value.relationship.trim(), is_self: value.is_self, source: value.source,
    birth: { date: birth.date, time: birth.certainty === 'known' ? birth.time : '', timezone: birth.timezone,
      location: birth.location, certainty: birth.certainty }, chart, notes: value.notes };
}

// No nickname, full birth data, observations, or unrelated chart fields in AI context.
export function anonymousPerson(person) {
  const core = person.chart?.core;
  return { source: person.source, revision: person.revision, certainty: person.birth?.certainty || 'unknown',
    chart: core && person.birth?.certainty === 'known' ? {
      type: core.type, strategy: core.strategy, authority: core.authority, profile: core.profile,
    } : null };
}

export function relationshipRepository(account) {
  const { client } = account;
  const check = owner => { if (!owner || account.user?.id !== owner) throw Error('ACCOUNT_CHANGED'); };
  async function rpc(name, args, owner) {
    check(owner); const { data, error } = await client.rpc(name, args); check(owner);
    if (error) throw error; return Array.isArray(data) ? data[0] : data;
  }
  return {
    async people(owner) {
      check(owner);
      const { data, error } = await client.from('buer_people').select('*').eq('user_id', owner).is('deleted_at', null).order('updated_at', { ascending: false }).limit(100);
      check(owner); if (error) throw error; return data;
    },
    save(owner, id, revision, mutation, value) {
      return rpc('buer_save_person', { person_id: id, expected_revision: revision, mutation, person: cleanPerson(value) }, owner);
    },
    remove(owner, person, mutation) {
      return rpc('buer_delete_person', { person_id: person.id, expected_revision: person.revision, mutation }, owner);
    },
    async conversations(owner, personId) {
      check(owner);
      const { data, error } = await client.from('buer_relationship_conversations').select('*').eq('user_id', owner).eq('person_id', personId).order('updated_at', { ascending: false }).limit(30);
      check(owner); if (error) throw error; return data;
    },
    saveConversation(owner, thread, mutation) {
      return rpc('buer_save_relationship_conversation', { conversation_id: thread.id, expected_revision: thread.revision || 0,
        mutation, own_id: thread.self_id, other_id: thread.person_id, own_revision: thread.self_revision,
        other_revision: thread.person_revision, conversation_messages: thread.messages }, owner);
    },
    async journals(owner) {
      check(owner);
      const { data, error } = await client.from('buer_journal_entries').select('id,title,body,entry_date,revision').eq('user_id', owner).is('deleted_at', null).order('entry_date', { ascending: false }).limit(100);
      check(owner); if (error) throw error; return data;
    },
  };
}
