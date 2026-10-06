import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accountConfig, createAccount, readAuthCallback, NATIVE_CALLBACK } from '../src/services/buer-account.js';

async function fixture({ native = false, plugin = {}, providers = ['google', 'apple'], auth = {}, fetchImpl } = {}) {
  const calls = [];
  let listener;
  const client = { auth: {
    onAuthStateChange(fn) { listener = fn; },
    async getUser() { return { data: { user: { id: 'A' } } }; },
    async getSession() { return { data: { session: { access_token: 'supabase-token' } } }; },
    async signInWithOAuth(value) { calls.push(['oauth', value]); return { data: { url: 'https://buer.supabase.co/auth/v1/authorize?provider=google' } }; },
    async signInWithIdToken(value) { calls.push(['idToken', value]); return {}; },
    async updateUser(value) { calls.push(['updateUser', value]); return {}; },
    async exchangeCodeForSession(value) { calls.push(['exchange', value]); return {}; },
    async signOut(value) { calls.push(['signOut', value]); return {}; },
    ...auth,
  } };
  let options;
  const account = await createAccount({
    config: { url: 'https://buer.supabase.co', key: 'public', apiUrl: 'https://buer-api.example', providers }, native, plugin, fetchImpl,
    loadSDK: async () => ({ createClient(url, key, value) { options = value; return client; } }),
  });
  return { account, calls, options, event: (...args) => listener(...args) };
}

test('only Apple and Google are allowed, including when stale config asks for email', async () => {
  const config = accountConfig({ buerAccountUrl: 'https://buer.supabase.co', buerAccountPublishableKey: 'public', buerAuthProviders: ' apple,google,email,google,password ' });
  assert.deepEqual(config.providers, ['apple', 'google']);
  const { account, calls } = await fixture({ providers: ['email', 'google'] });
  await assert.rejects(account.signIn('email'), /PROVIDER_UNAVAILABLE/);
  assert.equal(account.sendCode, undefined);
  assert.equal(account.verifyCode, undefined);
  assert.deepEqual(calls, []);
});

test('native Apple exchanges a nonce protected identity token, not a browser OAuth session', async () => {
  const { account, calls } = await fixture({ native: true, plugin: { accountAppleSignIn: async () => ({ identityToken: 'test-token', nonce: 'test-nonce', givenName: '豆豆', familyName: '龙' }) } });
  await account.signIn('apple');
  assert.deepEqual(calls, [
    ['idToken', { provider: 'apple', token: 'test-token', nonce: 'test-nonce' }],
    ['updateUser', { data: { full_name: '豆豆 龙', given_name: '豆豆', family_name: '龙' } }],
  ]);
});

test('a failed optional Apple name update never turns a successful login into an error', async () => {
  const { account } = await fixture({ native: true,
    plugin: { accountAppleSignIn: async () => ({ identityToken: 'test-token', nonce: 'test-nonce', givenName: 'Elian' }) },
    auth: { updateUser: async () => { throw new Error('offline'); } } });
  await account.signIn('apple');
});

test('native Google selects account and exchanges only the exact PKCE callback code', async () => {
  const { account, calls, options } = await fixture({ native: true, plugin: { accountOAuth: async () => ({ url: `${NATIVE_CALLBACK}?code=one-time-code` }) } });
  await account.signIn('google');
  assert.equal(options.auth.flowType, 'pkce');
  assert.equal(options.auth.detectSessionInUrl, false);
  assert.deepEqual(calls[0][1], { provider: 'google', options: { redirectTo: NATIVE_CALLBACK, skipBrowserRedirect: true, scopes: 'openid email profile', queryParams: { prompt: 'select_account' } } });
  assert.deepEqual(calls[1], ['exchange', 'one-time-code']);
});

test('web Apple and Google return to H5 without leaking its query or fragment', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { href: 'https://buer.wonderelian.com/?release=test#private' } });
  try {
    const { account, calls, options } = await fixture();
    await account.signIn('apple'); await account.signIn('google');
    assert.equal(options.auth.detectSessionInUrl, true);
    for (const [, value] of calls) {
      assert.equal(value.options.redirectTo, 'https://buer.wonderelian.com/');
      assert.equal(value.options.skipBrowserRedirect, false);
    }
    assert.equal(calls[0][1].options.scopes, 'name email');
    assert.deepEqual(calls[1][1].options.queryParams, { prompt: 'select_account' });
  } finally { if (previous) Object.defineProperty(globalThis, 'location', previous); else delete globalThis.location; }
});

test('foreign, ambiguous and credential-bearing callbacks never exchange a code', async () => {
  for (const url of ['buerwithin://auth/callback-evil?code=x', 'buerwithin://user@auth/callback?code=x', 'buerwithin://auth:123/callback?code=x', 'buerwithin://auth/callback?code=x#fragment']) assert.equal(readAuthCallback(url), null);
  assert.throws(() => readAuthCallback(`${NATIVE_CALLBACK}?code=a&code=b`));
  assert.throws(() => readAuthCallback(`${NATIVE_CALLBACK}?error_description=cancelled`), /AUTH_CANCELLED/);
  const { account, calls } = await fixture({ native: true, plugin: { accountOAuth: async () => ({ url: 'other://auth/callback?code=x' }) } });
  await assert.rejects(account.signIn('google'), /INVALID_AUTH_CALLBACK/);
  assert.equal(calls.length, 1);
});

test('native auth session and verifier use Keychain bridge storage', async () => {
  const disk = new Map();
  const { options } = await fixture({ native: true, plugin: {
    accountStorageGet: async ({ key }) => ({ value: disk.get(key) }),
    accountStorageSet: async ({ key, value }) => disk.set(key, value),
    accountStorageRemove: async ({ key }) => disk.delete(key),
  } });
  await options.auth.storage.setItem('buer-auth-v1-code-verifier', 'verifier');
  assert.equal(await options.auth.storage.getItem('buer-auth-v1-code-verifier'), 'verifier');
  await options.auth.storage.removeItem('buer-auth-v1-code-verifier');
  assert.equal(await options.auth.storage.getItem('buer-auth-v1-code-verifier'), null);
});

test('a delayed verified identity cannot reopen the prior account after sign out', async () => {
  let resolve;
  const waiting = new Promise(r => { resolve = r; });
  const { account, event } = await fixture({ auth: { getUser: () => waiting } });
  event('SIGNED_IN', { user: { id: 'A' } });
  await new Promise(r => setTimeout(r, 5));
  await account.signOut();
  resolve({ data: { user: { id: 'A' } } });
  await new Promise(r => setTimeout(r, 5));
  assert.equal(account.user, null);
});

test('failed sign out restores only a freshly verified identity', async () => {
  const { account } = await fixture({ auth: { signOut: async () => ({ error: new Error('offline') }) } });
  await assert.rejects(account.signOut(), /offline/);
  assert.equal(account.user.id, 'A');
});

test('same-user tab-focus SIGNED_IN keeps editing state, but a different identity locks immediately', async () => {
  const { account, event } = await fixture(); const notifications=[];
  account.subscribe(user => notifications.push(user?.id || null));
  event('SIGNED_IN', { user: { id: 'A' } }); await new Promise(r=>setTimeout(r,5));
  assert.equal(account.user.id,'A'); notifications.length=0;
  event('SIGNED_IN', { user: { id: 'A' } });
  event('TOKEN_REFRESHED', { user: { id: 'A' } });
  assert.deepEqual(notifications,[]); assert.equal(account.user.id,'A');
  event('SIGNED_IN', { user: { id: 'B' } }); assert.equal(account.user,null);
});

test('Google account deletion uses the verified session and dedicated Buer API', async () => {
  const requests = [];
  const { account, event, calls } = await fixture({ auth: {
    getUser: async () => ({ data: { user: { id: 'A', app_metadata: { provider: 'google' } } } }),
  }, fetchImpl: async (url, options) => { requests.push({ url, options }); return new Response(null, { status: 204 }); } });
  event('SIGNED_IN', { user: { id: 'A', app_metadata: { provider: 'google' } } });
  await new Promise(resolve => setTimeout(resolve, 5));
  await account.deleteAccount();
  assert.equal(requests[0].url, 'https://buer-api.example/v1/account/delete');
  assert.deepEqual(JSON.parse(requests[0].options.body), { provider: 'google' });
  assert.equal(requests[0].options.headers.Authorization, 'Bearer supabase-token');
  assert.deepEqual(calls.at(-1), ['signOut', { scope: 'local' }]);
});

test('native Apple deletion obtains a fresh authorization code without replacing the Supabase session', async () => {
  let payload;
  const { account, event, calls } = await fixture({ native: true, plugin: {
    accountAppleSignIn: async () => ({ authorizationCode: 'fresh-apple-code' }),
  }, auth: { getUser: async () => ({ data: { user: { id: 'A', app_metadata: { provider: 'apple' } } } }) },
  fetchImpl: async (_url, options) => { payload = JSON.parse(options.body); return new Response(null, { status: 204 }); } });
  event('SIGNED_IN', { user: { id: 'A', app_metadata: { provider: 'apple' } } });
  await new Promise(resolve => setTimeout(resolve, 5));
  await account.deleteAccount();
  assert.deepEqual(payload, { provider: 'apple', appleAuthorizationCode: 'fresh-apple-code' });
  assert.equal(calls.some(([name]) => name === 'idToken'), false);
});

test('login UI contains no email form or verification code fallback', async () => {
  const source = await readFile(new URL('../src/app/buer-journal.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /sendCode|verifyCode|one-time-code|邮箱验证码/);
  assert.match(source, /if \(action === 'logout'\) exit\(\)/);
});
