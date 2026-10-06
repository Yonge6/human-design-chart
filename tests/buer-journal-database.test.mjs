import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const A = '00000000-0000-4000-a000-000000000001', B = '00000000-0000-4000-a000-000000000002';
const entry = '00000000-0000-4000-b000-000000000001', mutation = '00000000-0000-4000-c000-000000000001';
test('Postgres RLS, CAS, retries, tombstones and account deletion isolate two real roles', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon, authenticated;
      insert into auth.users values ('${A}'), ('${B}');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202610050001_private_journal.sql', import.meta.url), 'utf8'));
    const as = async owner => { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`); };
    const save = (rev = 0, mut = mutation, body = 'private') => db.query('select (public.buer_save_journal($1,$2,$3,$4,$5,$6,$7)).*', [entry, rev, mut, 'Day', body, 'calm', '2026-10-05']);
    await as(A); const first = await save(); assert.equal(first.rows[0].user_id, A);
    assert.equal((await save()).rows[0].revision, 1);
    await as(B); assert.equal((await db.query('select * from public.buer_journal_entries')).rows.length, 0);
    await assert.rejects(save(), /journal_conflict/);
    await assert.rejects(db.exec(`update public.buer_journal_entries set body='stolen'`), /permission denied/);
    await assert.rejects(db.query('select public.buer_delete_journal($1,1,$2)', [entry, B]), /journal_conflict/);
    await as(A); const second = await save(1, B, 'updated'); assert.equal(second.rows[0].revision, 2);
    await assert.rejects(save(1, A), /journal_conflict/);
    await db.query('select public.buer_delete_journal($1,2,$2)', [entry, A]);
    await assert.rejects(save(3, B), /journal_conflict/);
    assert.equal((await db.query('select body from public.buer_journal_entries')).rows[0].body, '');
    await db.exec('reset role; set role anon'); await assert.rejects(save(), /permission denied/);
    await as(B); await assert.rejects(db.query('select public.buer_delete_account($1)', ['NO']), /confirmation_required/);
    await db.query('select public.buer_delete_account($1)', ['DELETE']);
    await db.exec('reset role'); assert.deepEqual((await db.query('select id from auth.users')).rows.map(x => x.id), [A]);
  } finally { await db.close(); }
});
