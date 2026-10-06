import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
const MAX_BODY = 4096;

const base64url = value => Buffer.from(value).toString('base64url');

function applePrivateKey(environment) {
  if (environment.BUER_APPLE_PRIVATE_KEY) return environment.BUER_APPLE_PRIVATE_KEY;
  if (!environment.BUER_APPLE_PRIVATE_KEY_FILE) throw new Error('APPLE_NOT_CONFIGURED');
  try { return readFileSync(environment.BUER_APPLE_PRIVATE_KEY_FILE, 'utf8'); }
  catch { throw new Error('APPLE_NOT_CONFIGURED'); }
}

export function createAppleClientSecret({ teamId, keyId, clientId, privateKey, now = () => Math.floor(Date.now() / 1000) }) {
  if (!/^[A-Z0-9]{10}$/.test(teamId || '') || !/^[A-Z0-9]{10}$/.test(keyId || '')
    || !/^com\.yonge6\.buerwithin(?:\.web)?$/.test(clientId || '') || !privateKey) throw new Error('APPLE_NOT_CONFIGURED');
  const issuedAt = now();
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iss: teamId, iat: issuedAt, exp: issuedAt + 86400 * 170,
    aud: 'https://appleid.apple.com', sub: clientId }));
  const data = `${header}.${payload}`;
  const signature = sign('sha256', Buffer.from(data), { key: createPrivateKey(privateKey.replace(/\\n/g, '\n')), dsaEncoding: 'ieee-p1363' });
  return `${data}.${signature.toString('base64url')}`;
}

function decodeJwtPayload(token) {
  const parts = token?.split('.');
  if (parts?.length !== 3) throw new Error('APPLE_RESPONSE_INVALID');
  try { return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); }
  catch { throw new Error('APPLE_RESPONSE_INVALID'); }
}

async function limitedJson(request) {
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('INVALID_REQUEST');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('INVALID_REQUEST'); }
}

function bearer(request) {
  const value = request.headers.authorization;
  if (typeof value !== 'string' || !/^Bearer [A-Za-z0-9._~-]+$/.test(value)) throw new Error('SIGN_IN_REQUIRED');
  return value;
}

function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(value === null ? '' : JSON.stringify(value));
}

export function createAccountDeletionHandler({ environment = process.env, fetchImpl = fetch } = {}) {
  const accountUrl = environment.BUER_ACCOUNT_URL;
  const publishableKey = environment.BUER_ACCOUNT_PUBLISHABLE_KEY;
  if (accountUrl && new URL(accountUrl).origin !== accountUrl) throw new Error('Invalid Buer account URL.');
  const attempts = new Map();
  return async function handleAccountDeletion(request, response) {
    if (request.url !== '/v1/account/delete') return false;
    if (request.method !== 'POST') { send(response, 405, { error: 'METHOD_NOT_ALLOWED' }); return true; }
    if (!accountUrl || !publishableKey) { send(response, 503, { error: 'ACCOUNT_NOT_CONFIGURED' }); return true; }
    try {
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new Error('INVALID_REQUEST');
      const authorization = bearer(request);
      const body = await limitedJson(request);
      if (!body || !['apple', 'google'].includes(body.provider) || Object.keys(body).some(key => !['provider', 'appleAuthorizationCode', 'appleProviderToken'].includes(key))) throw new Error('INVALID_REQUEST');
      const userResponse = await fetchImpl(`${accountUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: publishableKey } });
      if (!userResponse.ok) throw new Error('SIGN_IN_REQUIRED');
      const user = await userResponse.json();
      if (typeof user?.id !== 'string' || !user.id) throw new Error('SIGN_IN_REQUIRED');
      const now = Date.now(), previous = attempts.get(user.id);
      const attempt = !previous || previous.resetAt <= now ? { count: 1, resetAt: now + 600_000 } : { ...previous, count: previous.count + 1 };
      attempts.set(user.id, attempt);
      if (attempt.count > 5) throw new Error('RATE_LIMITED');
      const providers = new Set([user?.app_metadata?.provider, ...(user?.app_metadata?.providers || [])].filter(Boolean));
      if (!providers.has(body.provider)) throw new Error('PROVIDER_MISMATCH');
      // A linked Google identity must never become a way to skip revoking an
      // Apple authorization before deleting the shared Buer account.
      if (providers.has('apple') && body.provider !== 'apple') throw new Error('PROVIDER_MISMATCH');

      if (body.provider === 'apple') {
        const nativeCode = typeof body.appleAuthorizationCode === 'string' && body.appleAuthorizationCode;
        const webToken = typeof body.appleProviderToken === 'string' && body.appleProviderToken;
        if ((!nativeCode && !webToken) || (nativeCode && webToken) || nativeCode?.length > 2048 || webToken?.length > 4096) throw new Error('APPLE_REAUTH_REQUIRED');
        const clientId = nativeCode ? (environment.BUER_APPLE_NATIVE_CLIENT_ID || 'com.yonge6.buerwithin') : environment.BUER_APPLE_WEB_CLIENT_ID;
        const clientSecret = createAppleClientSecret({ teamId: environment.BUER_APPLE_TEAM_ID, keyId: environment.BUER_APPLE_KEY_ID,
          clientId, privateKey: applePrivateKey(environment) });
        let token = webToken, tokenType = 'access_token';
        if (nativeCode) {
          const tokenResponse = await fetchImpl(APPLE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: body.appleAuthorizationCode, grant_type: 'authorization_code' }) });
          if (!tokenResponse.ok) throw new Error('APPLE_REAUTH_FAILED');
          const tokens = await tokenResponse.json();
          const claims = decodeJwtPayload(tokens.id_token);
          const appleIdentity = user.identities?.find(identity => identity.provider === 'apple');
          const expectedSub = appleIdentity?.identity_data?.sub || appleIdentity?.id;
          if (!expectedSub || claims.sub !== expectedSub || claims.aud !== clientId || typeof tokens.refresh_token !== 'string') throw new Error('PROVIDER_MISMATCH');
          token = tokens.refresh_token; tokenType = 'refresh_token';
        }
        const revokeResponse = await fetchImpl(APPLE_REVOKE_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token, token_type_hint: tokenType }) });
        if (!revokeResponse.ok) throw new Error('APPLE_REVOKE_FAILED');
      }

      const deleteResponse = await fetchImpl(`${accountUrl}/rest/v1/rpc/buer_delete_account`, { method: 'POST',
        headers: { Authorization: authorization, apikey: publishableKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE' }) });
      if (!deleteResponse.ok) throw new Error('ACCOUNT_DELETE_FAILED');
      send(response, 204, null);
    } catch (error) {
      const code = ['SIGN_IN_REQUIRED', 'INVALID_REQUEST', 'PROVIDER_MISMATCH', 'APPLE_REAUTH_REQUIRED', 'RATE_LIMITED'].includes(error.message) ? error.message
        : error.message === 'APPLE_NOT_CONFIGURED' ? 'APPLE_NOT_CONFIGURED' : 'ACCOUNT_DELETE_FAILED';
      const status = code === 'SIGN_IN_REQUIRED' ? 401 : code === 'APPLE_NOT_CONFIGURED' ? 503 : code === 'APPLE_REAUTH_REQUIRED' ? 409 : code === 'RATE_LIMITED' ? 429 : 400;
      send(response, status, { error: code });
    }
    return true;
  };
}
