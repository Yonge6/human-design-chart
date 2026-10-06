# Private journal and shared H5 / iOS account implementation plan

**Goal:** Add a private, account-owned journal with one identity across Buer H5 and iOS, explicit account switching, and reliable drafts.

**Architecture:** Use a dedicated Buer Supabase Auth project with Apple / Google OAuth only, matching Wendao's account pattern without sharing Wendao's user data. The user explicitly declined email login on 2026-10-05: do not activate DirectMail or add OTP fallback. A PostgreSQL table enforces owner isolation with RLS. Version-checked RPC writes prevent silently overwriting another device. IndexedDB stores per-account pending edits; UI clears immediately when identity changes. No journal content enters chat or analytics.

**Tech stack:** Existing vanilla JS / CSS / Capacitor, pinned Supabase JS bundle, PostgreSQL, native AuthenticationServices and Keychain.

## 1. Account and persistence
- Add `src/services/buer-account.js`, `src/services/buer-journal.js` and a bundled SDK via `scripts/build-account-sdk.mjs`.
- Restore only verified sessions; support OAuth PKCE web/native callbacks, local sign-out, export, and account deletion. Apple iOS uses a native nonce-protected ID token; Google requests account selection. Apple web Services ID must be associated with Buer's primary App ID so web/native identify the same Apple user.
- Native session storage uses Keychain. Switching waits for pending saves, then removes journal cache and locks UI before sign-out. Cross-tab changes invalidate in-flight work.
- Test user A/B isolation, stale network results, offline edits, save coalescing, idempotent retry, conflict preservation, and cache errors.

## 2. Database
- Add `supabase/migrations/202610050001_private_journal.sql`.
- Owner-indexed journal table with limits, revision and mutation ID, soft deletion. No anonymous access or direct authenticated writes. RPCs derive owner from auth.uid(); CAS and mutation IDs protect retries and concurrent writes.
- Account deletion is for a dedicated Buer Auth project only. It deletes the requesting account and cascading records, never accepts a user ID. Apple deletion reauthenticates through Apple, verifies the same Apple subject on the server, revokes the provider token, then deletes the Buer account; web OAuth provider tokens are held only for the signed-in browser session.
- Verify RLS and RPC behavior with two users against PostgreSQL-compatible integration tests; verify hosted stack once configured.

## 3. Interface
- Add `src/app/buer-journal.js`, `buer-journal.css`, journal/account dialogs, home and My entry points.
- Chinese/English interface; text, date and optional mood; autosave; search and date filter; entry deletion, conflict copy, manual retry; explicit local/cloud status.
- Use existing design tokens and 16px mobile input text. Modal keyboard and safe-area behavior, native tab hiding, accessible focus and confirmation.
- Keep existing local conversations/manuals explicitly device-local; never silently import them into an account.

## 4. Native and build
- Add OAuth / Apple / Keychain methods in the existing native bridge. Native OAuth uses ASWebAuthenticationSession with the exact callback scheme/host/path and PKCE code exchange.
- Add Apple sign-in entitlement and public build config. Bundle the same UI in H5 and App.
- Update privacy copy and release notes to distinguish synced journal from existing local data; describe server storage accurately, do not claim end-to-end encryption.

## 5. Verification and rollout
- Run focused service/database tests, existing unit suite, production H5/native builds and SDK secret guard.
- Preview in browser at 390px and desktop: login/unavailable state, writing, switching, conflicts and translations with isolated test fixtures.
- Hosted provider setup, real two-account/two-client verification and device build are required before claiming cross-device production readiness.
- User has requested implementation; no need to pause for routine implementation choices. Do not mutate the currently submitted App Store review.
