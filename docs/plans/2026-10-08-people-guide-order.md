# People Guide and Ordering Implementation Plan

**Goal:** Add one-click relationship guidance and account-synced manual ordering.

**Architecture:** Reuse the existing relationship conversation for an explicit guide request, with unchanged consent, scope, quota and history safeguards. Store an ordered UUID array in an owner-only preferences table with revision checks, independently of people and chart revisions.

**Tech Stack:** Vanilla JS/CSS, Supabase PostgreSQL/RLS, Node test runner and PGlite.

## Approved design

- Cards retain About / Talk and add Relationship guide. Clicking sends a predefined request for practical guidance on strengths, communication, friction, conflict repair and a small shared action. No compatibility score or invented life facts.
- Adjust order opens an accessible list: desktop drag/drop and up/down/top controls, explicit Save/Cancel. All people are sorted together regardless of current relationship filter. Refresh reads the account order; new people append, deleted people disappear. Conflicts retain the draft and request a refresh, not silent overwrite.

## Execution

1. Add pure order normalization/move and guide-prompt tests in `tests/buer-people-tools.test.mjs`, run failing, implement in `src/services/buer-people-tools.js`.
2. Add migration `supabase/migrations/202610080001_people_order.sql`: owner-only select, RPC-only update, empty search path, validation, revision/CAS and idempotency. Test separate owners, foreign/deleted/self IDs, duplicate IDs, conflicts and unchanged profile revisions with PGlite.
3. Add repository order read/save; owner check before/after requests. Load order with people, expose sorting dialog, add guide action using the existing conversation submit handler. Preserve epoch guard and unsaved-state prompts.
4. Style controls in `buer-journal.css` using existing sage palette, 44px controls and mobile wrapping. Browser fixture checks desktop dragging, mobile controls, save/reload/cancel, guide submission, account changes and failures without real private writes.
5. Run `node --test tests/*.test.mjs` and `git diff --check`. Apply and independently verify additive database migration, publish fingerprinted H5, verify public deployment. No native installation claim without a native build.

Execution stays in the verified Buer release worktree and this task; no delegation or separate task required.
