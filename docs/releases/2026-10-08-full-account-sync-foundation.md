# Full account sync — foundation checkpoint, NOT a production release

User selected automatic legacy-data merge on login without another confirmation. This checkpoint implements the record contract and local-first sync engine; it is not connected to the current account/login/UI lifecycle yet.

## Implemented

- Additive migration for owner-isolated content records, select-only RLS and a revision-checked write RPC. Server derives ownership from `auth.uid()`, denies anonymous/direct writes, validates payload sizes and categories, preserves deletion tombstones and cascades account deletion.
- Durable per-account pending records, bounded pull pagination, explicit retries, late-response identity guards and in-flight local-edit preservation.
- Concurrent versions preserved as separate recovery records instead of overwritten. Restoration preserves the displaced version as another recovery record.
- One-time automatic import of the three existing content stores, only after durable save. The first account claims legacy ownership. Later accounts cannot import the same originals. Tokens, analytics and unrelated storage keys are excluded.
- Lossless collection mapper for full saved chat/manual objects and growth answers, stories, actions, reports and metadata. Mapping does not silently apply the old UI retention limits.

## Verification and boundaries

246 tests pass with `node --test --test-concurrency=1 tests/*.test.mjs`, including 14 new database/model tests. PGlite executes the migration with two authenticated identities plus an anonymous role. Client tests use isolated storage and a deterministic mock repository, not real accounts.

Covered: isolation, idempotency, conflicts, tombstones, deletion cascade, offline restart, changed cache sequence, storage-full failure, auto-import ownership, response loss after server commit, and account changes during pull and push.

Security review: restricted content-key collection; no provider configuration changes; no AI/analytics consent broadening; no raw SQL interpolation in application requests; fixed function search path; owner check before and after repository awaits. Remote content stays data and must still be rendered through existing escaping/sanitization during UI integration.

Not done: account/workspace storage adapter, guest workspace routing, UI data refresh/draft guards, same-browser tab serialization, removing destructive retention assumptions, full export/conflict UI, comprehensive copy/privacy updates, cross-device browser QA, production migration and H5 deployment. These are release blockers. Do not change the public account screen to claim all content syncs until these gates pass. Installed iOS builds are not updated by this work.
