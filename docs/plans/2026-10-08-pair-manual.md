# Pair Manual Implementation Plan

**Goal:** Replace one-shot guide chat with a persistent categorized pair manual, using the actual growth-tab chart and all canonical growth records.

**Architecture:** Add an owner-only guide-source snapshot and pair-manual table, separate from legacy excerpt-based conversation scopes. Explicitly confirm ownership before copying local growth data to the account. Read basic facts and cached sections without AI; generate only on request through the existing metered streaming endpoint. Preserve old content on failure and flag changed source/person revisions.

**Tech Stack:** Vanilla JS/CSS, Supabase RPC/RLS, Node tests/PGlite, existing SSE AI service.

## Approved behavior
- Six reading categories: overview, communication/decisions, emotions/rhythm, support/friction, repair/boundaries, daily practice.
- Complete chart projection (core, centers, channels, planet activations, variables; not identifying birth input) plus all growth answers, experiences, actions/reflections and growth report.
- First visit shows facts and a generation action; later visits read saved sections. Source changes offer an explicit update. No journal/history expansion in this dedicated guide.
- Source confirmation is required per account/update: local storage is not account-owned. Never silently import a different account's local chart. Basic display must distinguish cloud snapshot from unconfirmed local changes.

## Tasks
1. Add `src/services/buer-pair-manual.js` and tests for source projection, complete growth coverage, six-section validation, stale versions and context isolation.
2. Add `supabase/migrations/202610080002_pair_manual.sql` with source/guide tables, forced RLS, RPC-only mutations, revision and ownership checks, deletion cleanup. Exercise permissions and conflicts with PGlite.
3. Extend `api/relationship-context.mjs` and `api/chat.mjs` with a dedicated `relationship-guide` mode loading authoritative cloud source and selected person, with existing quotas/consent and bounded complete inputs. Reject excessive input rather than silently truncate it.
4. Add `src/app/buer-pair-manual.js`, wire growth-tab getter in `app.js`, replace guide button destination, add mobile reading tabs. Verify synthetic cached visits make no AI calls, changed data warning, generation failure retains old guide, account switch clears state.
5. Run full tests, publish additive DB/API/H5 changes with independent readback. Do not claim native App delivery without native build.

Execution continues locally in the verified existing worktree; no separate task or subagent requested. The named superpowers execution skill is unavailable; use the available Code workflow and explicit tests.
