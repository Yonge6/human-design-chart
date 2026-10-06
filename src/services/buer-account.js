// One Auth project / user ID for Buer H5 and iOS. No app secrets belong here.
export const NATIVE_CALLBACK = 'buerwithin://auth/callback';
export function readAuthCallback(value) {
  let url; try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'buerwithin:' || url.hostname !== 'auth' || url.pathname !== '/callback'
    || url.username || url.password || url.port || url.hash) return null;
  if (url.searchParams.has('error') || url.searchParams.has('error_description')) throw new Error('AUTH_CANCELLED');
  const codes = url.searchParams.getAll('code');
  const code = codes[0];
  if (codes.length !== 1 || !code?.trim()) throw new Error('AUTH_CODE_MISSING');
  return code;
}

export function accountConfig(config = globalThis.PLUTO_CONFIG || {}) {
  if (!config.buerAccountUrl || !config.buerAccountPublishableKey) return null;
  let url; try { url = new URL(config.buerAccountUrl); } catch { return null; }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return null;
  let apiUrl = '';
  if (config.apiBaseUrl) {
    try {
      const candidate = new URL(config.apiBaseUrl);
      if (candidate.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(candidate.hostname)) apiUrl = candidate.origin;
    } catch {}
  }
  return { url: url.origin, key: config.buerAccountPublishableKey, apiUrl,
    providers: [...new Set((config.buerAuthProviders || '').split(',').map(p => p.trim()).filter(p => ['apple', 'google'].includes(p)))] };
}

export async function createAccount({ config = accountConfig(), native = globalThis.Capacitor?.isNativePlatform?.(),
  plugin = globalThis.Capacitor?.Plugins?.PlutoNative, loadSDK = () => import('../../vendor/supabase/client.js'), fetchImpl = globalThis.fetch } = {}) {
  if (!config) return null;
  if (globalThis.isSecureContext === false && !native) return null;
  const { createClient } = await loadSDK();
  const storageKey = 'buer-auth-v1';
  const storage = native ? {
    getItem: async key => (await plugin.accountStorageGet({ key })).value ?? null,
    setItem: async (key, value) => { await plugin.accountStorageSet({ key, value }); },
    removeItem: async key => { await plugin.accountStorageRemove({ key }); },
  } : undefined;
  const client = createClient(config.url, config.key, { auth: {
    storageKey, storage, persistSession: true, autoRefreshToken: true,
    detectSessionInUrl: !native, flowType: 'pkce',
  } });
  const callbacks = new Set();
  let user = null;
  let appleProviderToken = native ? null : globalThis.sessionStorage?.getItem?.('buer-apple-provider-token') || null;
  let authEpoch = 0;
  const publish = next => { user = next; callbacks.forEach(fn => fn(user)); };
  // Never retain the previous account's content while a new session is verified.
  client.auth.onAuthStateChange((event, session) => {
    const providers = new Set([session?.user?.app_metadata?.provider, ...(session?.user?.app_metadata?.providers || [])].filter(Boolean));
    if (!native && providers.has('apple') && session?.provider_token) {
      appleProviderToken = session.provider_token;
      globalThis.sessionStorage?.setItem?.('buer-apple-provider-token', appleProviderToken);
    }
    if (event === 'SIGNED_OUT') {
      appleProviderToken = null;
      globalThis.sessionStorage?.removeItem?.('buer-apple-provider-token');
    }
    // Supabase emits SIGNED_IN again when a tab regains focus. A verified,
    // unchanged identity must not discard open forms on every focus event.
    if (['TOKEN_REFRESHED', 'SIGNED_IN'].includes(event) && user && session?.user.id === user.id) return;
    const epoch = ++authEpoch;
    publish(null);
    if (!session) return;
    // Supabase callbacks must not await another Auth call under its lock.
    setTimeout(async () => {
      const result = await client.auth.getUser().catch(() => ({ error: true }));
      if (epoch === authEpoch && !result.error && result.data?.user?.id === session.user.id) publish(result.data.user);
    }, 0);
  });
  return {
    client, config,
    get user() { return user; },
    subscribe(fn) { callbacks.add(fn); fn(user); return () => callbacks.delete(fn); },
    async signIn(provider) {
      if (!['apple', 'google'].includes(provider) || !config.providers.includes(provider)) throw new Error('PROVIDER_UNAVAILABLE');
      if (provider === 'apple' && native) {
        const credential = await plugin.accountAppleSignIn();
        const { error } = await client.auth.signInWithIdToken({ provider, token: credential.identityToken, nonce: credential.nonce });
        if (error) throw error;
        // Apple supplies the name only on the first native authorization. Keep it
        // as optional profile metadata without turning a metadata outage into a
        // failed login.
        const givenName = credential.givenName?.trim();
        const familyName = credential.familyName?.trim();
        const fullName = [givenName, familyName].filter(Boolean).join(' ');
        if (fullName) await client.auth.updateUser({ data: { full_name: fullName,
          ...(givenName ? { given_name: givenName } : {}), ...(familyName ? { family_name: familyName } : {}) } }).catch(() => {});
        return;
      }
      const redirectTo = native ? NATIVE_CALLBACK : new URL('./', location.href).href;
      const { data, error } = await client.auth.signInWithOAuth({ provider, options: {
        redirectTo, skipBrowserRedirect: Boolean(native),
        scopes: provider === 'apple' ? 'name email' : 'openid email profile',
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      } });
      if (error) throw error;
      if (native) {
        const { url } = await plugin.accountOAuth({ url: data.url });
        const code = readAuthCallback(url);
        if (!code) throw new Error('INVALID_AUTH_CALLBACK');
        const result = await client.auth.exchangeCodeForSession(code);
        if (result.error) throw result.error;
      }
    },
    async signOut() {
      const epoch = ++authEpoch; publish(null);
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) {
        // A failed remote sign-out must not leave a valid session invisibly locked.
        // Reverify rather than trusting the previously cached user.
        const result = await client.auth.getUser().catch(() => ({ error: true }));
        if (epoch === authEpoch && !result.error) publish(result.data?.user || null);
        throw error;
      }
      appleProviderToken = null;
      globalThis.sessionStorage?.removeItem?.('buer-apple-provider-token');
    },
    async deleteAccount() {
      if (!user || !config.apiUrl) throw new Error('ACCOUNT_DELETE_UNAVAILABLE');
      const providers = new Set([user.app_metadata?.provider, ...(user.app_metadata?.providers || [])].filter(Boolean));
      const provider = providers.has('apple') ? 'apple' : providers.has('google') ? 'google' : null;
      if (!provider) throw new Error('PROVIDER_UNAVAILABLE');
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error || !sessionResult.data?.session?.access_token) throw sessionResult.error || new Error('SIGN_IN_REQUIRED');
      const payload = { provider };
      if (provider === 'apple') {
        if (native) {
          const credential = await plugin.accountAppleSignIn();
          if (!credential.authorizationCode) throw new Error('APPLE_REAUTH_REQUIRED');
          payload.appleAuthorizationCode = credential.authorizationCode;
        } else {
          if (!appleProviderToken) throw new Error('APPLE_REAUTH_REQUIRED');
          payload.appleProviderToken = appleProviderToken;
        }
      }
      const response = await fetchImpl(`${config.apiUrl}/v1/account/delete`, { method: 'POST', headers: {
        Authorization: `Bearer ${sessionResult.data.session.access_token}`, 'Content-Type': 'application/json',
      }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'ACCOUNT_DELETE_FAILED');
      ++authEpoch; publish(null); appleProviderToken = null;
      globalThis.sessionStorage?.removeItem?.('buer-apple-provider-token');
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
    },
  };
}
