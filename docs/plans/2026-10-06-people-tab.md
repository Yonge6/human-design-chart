# 身边的人 Implementation Plan

> Execution: execute in the existing dedicated worktree; no delegated agents. User confirmed the design and journal/history consent on 2026-10-06.

**Goal:** Replace duplicate self-person setup with a first-class People tab and owner-authorized personal context.

**Architecture:** Keep people and legacy conversations intact. Add an owner-only context/preferences record and a v2 conversation writer with nullable legacy self references. An explicit account-bound import chooses an existing personal reading and confirms ownership of local growth/history. Cloud journals and same-person relationship history are retrieved by the server only under saved consent and per-request scope reductions. All context is bounded, ranked reference data, never instructions.

**Tech Stack:** Vanilla JS/CSS, Capacitor/UIKit tabs, Supabase PostgreSQL RLS/RPC, Node API and node:test/PGlite.

## Task 1 — Context contract and tests

Files: `src/services/buer-personal-context.js`, `tests/buer-personal-context.test.mjs`, `api/relationship-context.mjs`.
1. Write tests for disabled scopes, deterministic bounded relevance, malformed payloads and account ownership.
2. Run `node --test tests/buer-personal-context.test.mjs` (fail before implementation).
3. Implement strict fields: chart, answers, stories, actions, chats; consent scopes chart/growth/journal/history. Prefer relevant excerpts, return source labels.
4. Run tests; preserve legacy selection tests.

## Task 2 — Additive database upgrade

Files: `supabase/migrations/202610060002_people_context.sql`, `src/services/buer-relationships.js`, `tests/buer-relationships.test.mjs`.
1. Test owner-only context read/write, revision conflicts and v2 conversation without self-person.
2. Add `buer_personal_context` with FK cascade, forced RLS, authenticated select, definer CAS RPC. Consent is per-account, default off. Add context_revision to conversation rows; do not delete/migrate old person records.
3. Add v2 conversation RPC validating other-person owner/revision and context revision; preserve v1 writer for existing clients.
4. Run PGlite and all Node tests. API reads selected owner record and refuses stale/missing consent.

## Task 3 — People workspace

Files: `src/app/buer-relationships.js`, `app.js`, `index.html`, `buer-journal.css`, `src/app/buer-growth.js`, `ios/App/App/PlutoViewController.swift`.
1. Add fourth rail/native tab `people` between growth and profile. List is a full workspace, editor/chat remain accessible dialogs. Match current companion tokens and compact hero.
2. Show other people only; preset parents/lovers/spouses/children/colleagues/partners/friends/other chips and editable relation field. No duplicate self create form.
3. Account-context settings: select existing personal reading (never assume last viewed belongs to self); first authorization all scope toggles visibly off. Explicit confirmation imports local personal information. Show scope/source/status in chat; can disable categories and review retrieved source labels. No hidden automatic import after account switch.
4. Preserve prior person conversations as read-only when versions mismatch; new dialogs work even without any own chart. Existing self-person is only an optional explicitly selected import source, not shown as a person card.
5. Validate 390/500/desktop layouts, navigation, loading/errors, input zoom/font sizes, keyboard and closing dirty edits.

## Task 4 — Release and acceptance

1. Run `node --test tests/*.test.mjs`, syntax and `git diff --check`.
2. Apply additive migration; verify RLS in rolled-back synthetic transaction. No real journal contents in logs.
3. Build and deploy API then H5. Read back source version and test new person without self, authorization/settings, paired reply, cloud history and deletion using synthetic records.
4. Build/install current native test app if device available; keep App Store status separate.
5. Remove synthetic QA records, document release evidence and limitations. Do not claim all local history is automatically cloud synchronized; explicit import snapshot status is visible.
