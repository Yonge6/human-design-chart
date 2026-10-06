import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountDeletionHandler, createAppleClientSecret } from '../api/account-deletion.mjs';

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const env = { BUER_ACCOUNT_URL: 'https://buer.supabase.co', BUER_ACCOUNT_PUBLISHABLE_KEY: 'public',
  BUER_APPLE_TEAM_ID: 'L855ZVM679', BUER_APPLE_KEY_ID: 'ABC123DEFG', BUER_APPLE_PRIVATE_KEY: pem,
  BUER_APPLE_NATIVE_CLIENT_ID: 'com.yonge6.buerwithin', BUER_APPLE_WEB_CLIENT_ID: 'com.yonge6.buerwithin.web' };

function jwt(payload) { return `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.x`; }

async function server(t, fetchImpl, environment = env) {
  const handler = createAccountDeletionHandler({ environment, fetchImpl });
  const app = createServer((request, response) => handler(request, response));
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  return `http://127.0.0.1:${app.address().port}`;
}

test('Apple client secret is a short-lived ES256 JWT with no private key material', () => {
  const token = createAppleClientSecret({ teamId: env.BUER_APPLE_TEAM_ID, keyId: env.BUER_APPLE_KEY_ID,
    clientId: env.BUER_APPLE_NATIVE_CLIENT_ID, privateKey: pem, now: () => 1000 });
  const [header, payload] = token.split('.').slice(0, 2).map(part => JSON.parse(Buffer.from(part, 'base64url')));
  assert.deepEqual(header, { alg: 'ES256', kid: 'ABC123DEFG', typ: 'JWT' });
  assert.deepEqual(payload, { iss: 'L855ZVM679', iat: 1000, exp: 1000 + 86400 * 170,
    aud: 'https://appleid.apple.com', sub: 'com.yonge6.buerwithin' });
  assert.doesNotMatch(token, /PRIVATE KEY/);
});

test('Apple deletion accepts a private key from a protected credential file', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'buer-apple-credential-'));
  const path = join(directory, 'apple_private_key');
  writeFileSync(path, pem, { mode: 0o600 });
  const environment = { ...env, BUER_APPLE_PRIVATE_KEY: '', BUER_APPLE_PRIVATE_KEY_FILE: path };
  const fetchImpl = async url => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-a', app_metadata: { provider: 'apple' }, identities: [{ provider: 'apple', id: 'apple-user' }] });
    if (url.endsWith('/auth/revoke')) return new Response('', { status: 200 });
    if (url.endsWith('/rest/v1/rpc/buer_delete_account')) return Response.json(true);
    throw new Error('unexpected request');
  };
  const base = await server(t, fetchImpl, environment);
  const response = await fetch(`${base}/v1/account/delete`, { method: 'POST',
    headers: { Authorization: 'Bearer signed.jwt.token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'apple', appleProviderToken: 'apple-access' }) });
  assert.equal(response.status, 204);
});

test('native Apple deletion verifies the same identity, revokes the refresh token, then deletes the account', async t => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-a', app_metadata: { providers: ['apple'] },
      identities: [{ provider: 'apple', id: 'apple-user', identity_data: { sub: 'apple-user' } }] });
    if (url.endsWith('/auth/token')) return Response.json({ id_token: jwt({ sub: 'apple-user', aud: 'com.yonge6.buerwithin' }), refresh_token: 'apple-refresh' });
    if (url.endsWith('/auth/revoke')) return new Response('', { status: 200 });
    if (url.endsWith('/rest/v1/rpc/buer_delete_account')) return Response.json(true);
    throw new Error('unexpected request');
  };
  const base = await server(t, fetchImpl);
  const response = await fetch(`${base}/v1/account/delete`, { method: 'POST', headers: { Authorization: 'Bearer signed.jwt.token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'apple', appleAuthorizationCode: 'one-time-code' }) });
  assert.equal(response.status, 204);
  assert.deepEqual(requests.map(request => new URL(request.url).pathname), ['/auth/v1/user', '/auth/token', '/auth/revoke', '/rest/v1/rpc/buer_delete_account']);
  assert.equal(new URLSearchParams(requests[2].options.body).get('token'), 'apple-refresh');
});

test('web Apple deletion revokes the callback access token with the Services ID', async t => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-a', app_metadata: { provider: 'apple' }, identities: [{ provider: 'apple', id: 'apple-user' }] });
    if (url.endsWith('/auth/revoke')) return new Response('', { status: 200 });
    if (url.endsWith('/rest/v1/rpc/buer_delete_account')) return Response.json(true);
    throw new Error('unexpected request');
  };
  const base = await server(t, fetchImpl);
  const response = await fetch(`${base}/v1/account/delete`, { method: 'POST', headers: { Authorization: 'Bearer signed.jwt.token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'apple', appleProviderToken: 'apple-access' }) });
  assert.equal(response.status, 204);
  const revoke = new URLSearchParams(requests[1].options.body);
  assert.equal(revoke.get('client_id'), 'com.yonge6.buerwithin.web');
  assert.equal(revoke.get('token_type_hint'), 'access_token');
});

test('provider mismatch and missing Apple proof never delete an account', async t => {
  let deletes = 0;
  const base = await server(t, async url => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-a', app_metadata: { provider: 'apple' }, identities: [] });
    if (url.endsWith('/rest/v1/rpc/buer_delete_account')) deletes++;
    return new Response('', { status: 500 });
  });
  const headers = { Authorization: 'Bearer signed.jwt.token', 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${base}/v1/account/delete`, { method: 'POST', headers, body: JSON.stringify({ provider: 'google' }) })).status, 400);
  assert.equal((await fetch(`${base}/v1/account/delete`, { method: 'POST', headers, body: JSON.stringify({ provider: 'apple' }) })).status, 409);
  assert.equal(deletes, 0);
});

test('a linked Google identity cannot bypass Apple revocation', async t => {
  let deletes = 0;
  const base = await server(t, async url => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-a', app_metadata: { providers: ['apple', 'google'] }, identities: [] });
    if (url.endsWith('/rest/v1/rpc/buer_delete_account')) deletes++;
    return new Response('', { status: 500 });
  });
  const response = await fetch(`${base}/v1/account/delete`, { method: 'POST',
    headers: { Authorization: 'Bearer signed.jwt.token', 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google' }) });
  assert.equal(response.status, 400);
  assert.equal(deletes, 0);
});
