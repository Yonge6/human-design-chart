# Companion brand website release — 2026-09-30

- Selected design: website option 2, Sage Studio, with approved Doudoulong journal logo.
- Site: https://buer.wonderelian.com/?v=09a008e
- Source: 09a008e5c5019d5a4a579d79d63994c8b0ce5ba5 (codex/buer-ui-redesign).
- Artifact repository: Yonge6/buer-life-manual-preview, main.
- Artifact: 1354549913266946cc0eec746cf31b27778f3bbf.
- Pre-release rollback: 9501d50f3b292188f632b9d90a6e272d731cd478.
- Pages run: 36676383062, completed/success.
- Build: node scripts/build-buer-preview.mjs; fingerprint a6c4d9b877627c7b.
- Validation: 38 targeted existing tests passed; diff checks clean; desktop 1487 × 1058, tablet 900 × 1000, mobile 390 × 844 reviewed.
- Public verification: 9/9 key resources match published tree SHA-256, including HTML, runtime, brand CSS, all 4 image assets, home module and daily-tip renderer. See companion-live-verification.json.
- In-app browser loaded public URL and confirmed new logo/versioned styles, functioning saved-manual context display and no horizontal overflow at 390px. Screenshot: docs/design/companion/live-mobile.webp.
- No backend changes, native installation, App Store changes or live AI-provider certification in this release.

Rollback by publishing the previous artifact tree as a new commit; retain CNAME and dedicated API configuration.
