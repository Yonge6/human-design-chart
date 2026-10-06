# Buer account provider checkpoint — 2026-10-05

## User decision

Only Google and Apple sign-in. Follow Wendao's web/native pattern, but keep Buer identities and data in an independent project. Do not enable email OTP or activate DirectMail.

## Completed configuration

- Dedicated Supabase project: `buer-production`, `hiuphqtqqvejyjgoxfov`.
- Site URL: `https://buer.wonderelian.com/`; native redirect: `buerwithin://auth/callback`.
- Google Cloud project: `buer-within`; external OAuth audience published to production.
- Google web client: `Buer H5 and App via Supabase`.
- Client ID: `24680768184-vi3albu1tori9anhh19kocase42g0mr6.apps.googleusercontent.com`.
- Authorized origin: `https://buer.wonderelian.com`.
- OAuth callback: `https://hiuphqtqqvejyjgoxfov.supabase.co/auth/v1/callback`.
- Client secret is in macOS Keychain, service `buer-google-oauth-20261005`, account equal to the client ID. Never commit or print the secret.
- Supabase public settings readback on 2026-10-06: Google and Apple enabled; email and anonymous sign-in disabled.
- Google authorize request returned HTTP 302 to `accounts.google.com` with the expected client and callback. A real local-preview Google account session was restored, but production H5/App identity matching still needs a fresh acceptance pass.

## Apple configuration completed 2026-10-06

Existing Buer App ID: `com.yonge6.buerwithin`, Apple record `GWNB5H53TH`, team `L855ZVM679`.

- Sign in with Apple enabled on App ID `com.yonge6.buerwithin` as the primary App ID. Existing provisioning profiles were invalidated by Apple and must be regenerated before the next native archive.
- Services ID `com.yonge6.buerwithin.web` created and associated with the Buer primary App ID. Domain is `hiuphqtqqvejyjgoxfov.supabase.co`; return URL is `https://hiuphqtqqvejyjgoxfov.supabase.co/auth/v1/callback`; server-to-server notifications remain blank.
- Dedicated key `Buer Sign In with Apple`, Key ID `PD53RM22W2`, created for the Buer primary App ID. Its one-time `.p8` is outside the repository with mode 600 locally and on the server; Wendao credentials were not reused or changed.
- Supabase Apple Provider saved with client IDs `com.yonge6.buerwithin.web,com.yonge6.buerwithin`, Services ID first. The 170-day OAuth client secret was generated only in memory from the protected key.
- The dedicated account deletion route was published at `https://buer-api.wonderelian.com/v1/account/delete`. Production uses systemd `LoadCredential`, not a private key environment value. Public allowed-origin preflight returns 204, unauthenticated deletion returns 401, and disallowed origins return 403.

## Local implementation and evidence

- Email/OTP UI and methods removed; hard allowlist accepts only Google/Apple.
- Native Apple uses nonce-protected ID token exchange. Native Google uses PKCE and a strictly checked authorization URL/callback; Google requests account selection.
- Native Apple captures the first-authorization name and keeps login successful if the optional metadata update is unavailable.
- Account deletion now has a server-only revocation path: native Apple obtains a fresh authorization code, the API verifies the same Apple subject, revokes the refresh token, then deletes the Supabase account; H5 revokes the provider access token captured from the OAuth callback. Google deletion uses the same authenticated account endpoint. Apple key material never enters the browser build.
- Account switching locks the old account UI; logout closes the panel and switching retains login choices.
- Full Node suite: 189 passing, 0 failures. Focused authentication/deletion suite: 18 passing.
- Swift frontend parse passed; this does not replace an Xcode build or device test.
- Production artifact verification passed before the Apple configuration; a final H5 publication with both providers remains required.
- Local preview at 390px: document scrollWidth 390px, login button 350 × 44.5px; the login screen contains Apple and Google with no email fallback.

## Release gates still open

- Real Apple sign-in, same-provider H5/App identity matching, two-account isolation and two-client sync.
- Publish and read back the updated privacy disclosure; do not claim end-to-end encryption.
- Run a real Apple deletion/revocation test with a disposable Apple-backed Buer account; mocked endpoint tests and unauthenticated production probes do not prove Apple accepted a live revoke request.
- Full native build, signing/provisioning and device authentication tests.
- Relationship feature integration/security validation and second migration remain unfinished; first journal migration was applied previously.
- No App upload, review withdrawal or review submission performed. H5 publication and native provisioning regeneration remain separate release steps.
