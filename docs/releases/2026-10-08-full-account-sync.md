# Full account sync and relationship guide v2 — H5 release

## Scope

The user explicitly approved H5 deployment and automatic first-login merging without another confirmation. Ordinary chats, complete growth records and saved Life Manuals now use the account-owned workspace alongside existing private journals, people, relationship conversations and saved guides. Authentication providers and AI consent are unchanged. This is not a native App Store release.

## Implementation

- Selected-content storage adapter; immutable local write log plus Web Locks for same-browser serialization, revision-checked RPCs, durable offline retry, deletion tombstones and preserved conflicting versions.
- First verified account claims legacy content once. Later accounts never import another account's cache. New guest content is separately claimed on login.
- UI identity epochs stop stale chart/AI/file callbacks; active content is cleared on identity changes. Unsubmitted chat/new-story/action drafts are locally scoped to their account. Pending edits and conflicts can be exported, retried and restored from Account.
- JSONB key order is ignored when comparing payloads. Existing collection display limits no longer silently delete older chats, manuals or growth collections.
- Six relationship categories now cover understanding each other, communication, shared decisions, sustainable rhythm, repair and practical agreements. Numeric chart evidence is expandable. New generation requests a longer five-part overview and an evidence-to-action link in every section. Previously saved prose is retained as a legacy reading until explicit update; no automatic AI charge.

## Verification completed before publish

- `node --test --test-concurrency=1 tests/*.test.mjs`: 254 passed, zero failures (39 seconds).
- Browser at 390 × 844 and desktop: six-category navigation and expandable evidence; no mobile horizontal overflow (viewport/document/dialog width all 390).
- Synthetic browser account A → B → A: B has zero A chats/stories/manuals; A recovers all three after returning. No real user data or AI requests used.
- Actual growth-answer form, synthetic offline repository: edited text retained with pending status; reconnect/retry reaches synced with pending zero and identical cloud payload.
- Unit fixtures additionally cover two independent clients, simultaneous tabs, deletion propagation, restart, quota/storage failure, stale writes, conflicts and JSONB round trips.
- Production Buer Supabase `hiuphqtqqvejyjgoxfov`: additive migration `202610080003_workspace_sync.sql` applied. SQL authenticated-role contract verified owner access, cross-user isolation and stale revision rejection. RLS enabled/forced, direct and anonymous writes denied, auth-user deletion cascade present. Synthetic SQL users/records rolled back.
- Production anonymous HTTP REST select and RPC each returned `401 / 42501`. These are not claimed as a real OAuth user end-to-end test.

## Publish procedure / evidence boundary

Commit source, run `scripts/build-buer-preview.mjs` with the already-live Buer public account configuration, copy the dedicated artifact to `Yonge6/buer-life-manual-preview`, and publish GitHub Pages. The public runtime commit and newly added modules must be read back before reporting live completion. Do not use the generic test build as the release artifact.

Existing installed native builds do not gain these frontend changes until a separate native build/release. Cold offline account verification remains dependent on the existing Auth flow; the persistent content cache is not a bypass for login verification. Account synchronization does not mean personal information is automatically sent to AI.
