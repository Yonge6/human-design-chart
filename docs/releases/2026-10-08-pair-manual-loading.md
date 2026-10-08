# Persistent relationship manual and loading previews

- Source: `cac8efb` (pair manual), `0940494bd477d58220b819adfd663ee091faa3bf` (loading/UI).
- Final static release: `e95306147eec2b271e376d00f4cd17390b46474e`.
- Asset fingerprint: `ec37daf4b5f71f93`.
- API active release: `/srv/buer-jianji/releases/20261008-pair-cac8efb`; previous release retained.
- Migration `202610080002_pair_manual.sql` applied. Independent synthetic owner/other-owner transaction returned `PAIR_MANUAL_RLS_PASS_ROLLED_BACK`; both tables have forced RLS. Verification fixtures rolled back.

## Behavior

Six saved reading categories use the growth-tab chart and complete canonical growth records. Opening saved content does not call AI. Changed source revisions preserve older readings; failed saves offer save-only retry. Local source ownership is confirmed before syncing. Journals and history are excluded from this manual's source.

People, journal and manual loading use labeled color skeletons. People refresh keeps already loaded cards, including on request failure. Manual generation has preparing/generating/saving stages without percentage claims. Daily poster displays the actual note until the generated image decodes. Reduced-motion preference disables pulsing.

The home growth checkbox includes the chart summary. Removed duplicate personal-space navigation and requested homepage/poster captions. Existing quota is unchanged; no native build or App Store submission in this release.

## Verification

- `node --test tests/*.test.mjs`: 213 passed, zero failures.
- `git diff --check`: clean.
- Synthetic browser pair-manual flow: open no AI call, generate once, reopen/category changes no new call; failed save preserves old version; save-only retry does not regenerate; account change clears dialog.
- Deferred synthetic people queries: labeled skeleton visible while three reads pending; resolves to normal list and removes skeletons.
- 390px local loading screenshot inspected; no horizontal overflow.
- Public browser independently read source `0940494`, fingerprint `ec37daf4b5f71f93`, initialized People tab, removed toggle/caption and duplicate drawer links, and no horizontal overflow.
- Public API health: configured true, growthCoach 1. Remote API hashes match local source.
- Public runtime and loading module also independently fetched from server. Local GitHub Actions API requests encountered EOF/TLS timeouts; no Actions-success assertion made. Public deployed assets and initialized page verified instead.
- During static publication, generic build temporarily omitted Pages metadata; CNAME/nojekyll restored and final output rebuilt with the project's dedicated Buer preview builder, preserving domain and preview SEO settings.
- No real private user content was submitted to the AI provider during QA; generation transport tests were synthetic.
