# Full Account Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Synchronize general conversations, complete growth records and saved Life Manuals with the same private Buer account, alongside existing journals, people and relationship guides.

**Architecture:** Local-first, account-owned records with revision-checked cloud mutations, durable retry queues and deletion tombstones. Split collections into records rather than overwriting an entire device snapshot. Import legacy device data automatically on the first verified login, as explicitly requested by the user on 2026-10-08; durably claim its owner so later accounts never import it again. Preserve concurrent versions rather than silently choosing a winner. Cloud synchronization does not enable AI access or analytics.

**Tech Stack:** Existing ES modules, Supabase Auth/Postgres/RLS/RPC, local persistent cache, Node test runner/PGlite, existing H5 components.

---

## Design choices and release gates

Complete for H5: Tasks 1–4 implemented; 254 full-suite tests and 36 post-copy focused tests pass. Browser synthetic account switching, offline editing/retry and 390px layout verified. Production additive migration and authenticated-role isolation/CAS checks passed; anonymous HTTP access denied. Pages run 37755886721 succeeded; public runtime/modules match feature source 5841999 and asset cb403477cef1f12c. See `docs/releases/2026-10-08-full-account-sync.md` for exact boundaries, including no native release or real-user OAuth end-to-end claim. Immutable local transactions plus Web Locks serialize same-browser writers. New guest-workspace routing is separate from the one-time legacy importer.

- Selected: per-record sync with offline persistence; no initial confirmation dialog.
- Rejected: cloud-only reads (slow/offline unavailable); whole-device last-write-wins backup (empty devices and concurrent edits can overwrite data).
- Existing unowned data moves to the first verified account only. New signed-out records remain a separate guest workspace until a verified login imports them. Account data is hidden immediately on sign-out; an old asynchronous operation must not write into the new account.
- Conversations, manuals, answers, stories, actions and generated growth reports are content. Credentials, billing/quota state, anonymous identity, analytics events and AI processing consents are NOT copied as generic workspace content.
- Existing collection limits must not be interpreted as deletion. Explicit user deletion generates tombstones; data outside a visible page must not disappear remotely.
- Current saved relationship source snapshots remain versioned, not overwritten as a side effect of background sync. Existing guide refresh semantics remain explicit.
- Export must include sync conflicts and pending edits. Deleting an account cascades all new rows and removes its local cache; clearing a collection must disclose cross-device deletion.
- H5 and database release are independently verified. Shared source does not imply an installed iOS app was updated.

### Task 1: Cloud record contract and isolation

**Files:** Create `supabase/migrations/202610080003_workspace_sync.sql` and `tests/buer-workspace-sql.test.mjs`.

1. Write failing tests for two authenticated users, anonymous rejection, revision conflicts, retry idempotency, invalid input, tombstones, account-deletion cascade and direct-write denial.
2. Run `node --test tests/buer-workspace-sql.test.mjs` and verify the missing migration fails.
3. Implement `buer_workspace_records` keyed by `(user_id,kind,record_id)`, owner RLS, server timestamps, revision and mutation ID. Restrict writes to an owner-derived RPC with a fixed search path, size/type validation and bounded owner record count.
4. Re-run the tests. Do not apply production migrations in this step.

### Task 2: Local-first record engine and legacy import

**Files:** Create `src/services/buer-workspace-sync.js`, `src/services/buer-workspace-data.js`, `tests/buer-workspace-sync.test.mjs`.

1. Test independent inserts, edits, deletion propagation, offline restart, account switching during pull/push, no automatic retry loops on conflicts, legacy import idempotency and storage-full failures.
2. Implement pure record transitions first, then account-scoped persistence and repository adapter. Store a base revision, pending mutation and payload for each dirty record; retain changed local payload if a request completes after another local edit.
3. Conflict responses preserve both versions and become visible/exportable; never silently turn deletion into resurrection.
4. Mapper imports exactly the current three content stores: `buer-conversations-v1`, `buer-growth-profile-v1`, `pluto-chart-history-v1`. Growth fields/records are independent; ordinary chat/manual IDs remain stable. No token or consent keys are collected.
5. Run focused tests before UI integration.

### Task 3: Connect all persistence and account lifecycle

**Files:** Modify `app.js`, `src/app/buer-home.js`, `src/app/buer-growth.js`, `src/app/buer-journal.js`, `src/app/buer-relationships.js`, and `src/services/storage-service.js` as needed. Add a dedicated UI adapter instead of intercepting all browser storage.

1. Route selected content writes and reads through account-owned workspace storage; notify each UI when its dataset changes.
2. Guard chart generation, AI streaming, imported files, drafts and delayed saves with the active workspace epoch. Switching identity clears rendered content and invalidates pending callbacks immediately.
3. Background remote merges must not discard a focused unsaved form. Save completed edits to the original owner, or show a recoverable draft.
4. Add account sync status, explicit retry, conflict recovery and full export. Sign-out must not report success while silently discarding pending edits; account deletion clears all synced categories.
5. Update device-only text in account, conversation, growth, history and privacy surfaces only after behavior works. Keep settings/consent semantics accurate.

### Task 4: End-to-end, release and evidence

**Files:** New regression fixtures and `docs/releases/2026-10-08-full-account-sync.md`.

1. Run focused tests, then `node --test --test-concurrency=1 tests/*.test.mjs`.
2. Browser QA two accounts/two clients: automatically migrate old content; new empty device receives it; offline edit survives restart; simultaneous edit preserves both; deletion remains deleted; sign-out/switch never shows another user's content; 390px mobile status/recovery/export work.
3. Verify target Buer project and migration authority before production schema changes. Apply additive migration and read back RLS/RPC definitions. Do not change Google/Apple provider configuration.
4. Publish H5 only after schema is ready. Read back deployed source hash and test real authenticated endpoints with dedicated test data, not by rewriting the user's personal records.
5. Record exact test, schema and deployment evidence. If a gate is unavailable, report precisely what remains local versus live; do not change the account screen to claim universal sync prematurely.
