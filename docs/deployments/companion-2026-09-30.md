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

## Growth / My Space extensions and alignment fix
- Source: de8da791621e34a9293598bfca9b43bbad7b6acc.
- Artifact: 8603e63f88c9fc74841d7bd28063217bcaafd03d; rollback 1354549913266946cc0eec746cf31b27778f3bbf.
- Pages run 36686480619 completed successfully; runtime readback reports de8da79.
- Public browser confirms the language container and both buttons share center Y 43.5; both context labels, their text and checkboxes share center Y 546.7890625 (desktop saved-manual state).
- Public My Space displays the warm header and loaded waving character, fingerprint f47abfe46ca250a9.
- New header visual checks passed in Chinese desktop/mobile and English mobile; 34 targeted tests passed.

## Shared primary-tab width
- Source: 8c73059ec727ed4cac0edffea8a7be9e15c940f0.
- Artifact: 1b760b4bb296ef1d3074f0e516d952d2e0f6856d; rollback 8603e63f88c9fc74841d7bd28063217bcaafd03d.
- Pages run 36696293702 completed successfully; deployed fingerprint 13e7a134f501c20e.
- Public browser readback at 1440 px confirmed Home, Growth and My Space use the same 1200 px outer grid and 1128 px content width. At 390 px, all three use 20 px page gutters and document width remains 390 px with no horizontal overflow.
- Public `index.html`, `runtime-config.js` and `buer-companion.css` SHA-256 values match the published artifact exactly. The 33 directly related tests passed; the wider 139-test run retained one unrelated pre-existing iOS build-number alignment failure.

## Share posters, previous-page navigation and readable cards
- Source: e64defe4db0e051a17545c8611866c44df2f2e91 (implementation 904e7ff).
- Artifact: 45fa83c8070f09bb25e76f2f95cb3d8d48ec29eb; pre-change rollback 1b760b4bb296ef1d3074f0e516d952d2e0f6856d.
- Pages run 36698946364 completed successfully; fingerprint 2760ef975bd16f74.
- Daily note: 1080 × 1440 PNG, paper/sage editorial layout, separate mascot vignette, date rail and QR footer; Chinese punctuation wrapping tested.
- Full chart: light paper export with legible dark text, structured planetary columns, preserved BodyGraph/data and branded loading/error states.
- Back restores the originating workspace, existing subview, focus and scroll instead of reopening Home. Browser checks passed for Home, Growth (including editing), and My Space → history → manual → history.
- Navigation and portfolio card titles use 16px/1.5; supporting text uses 14px/1.65. Chinese/English mobile checks at 390px show no horizontal overflow; desktop reviewed at 1320px.
- 32 focused tests passed. Actual local privacy export saved as private-life-manual.png with masked name/birth data. Both languages' generated images were visually inspected.
- Public runtime reports e64defe; HTML, runtime config, companion CSS, app JS and daily poster renderer all match the artifact SHA-256. Public daily image and 1200 × 3676 full-chart generation, Home/history returns, 16/14px computed fonts, and mobile no-overflow were independently verified with a synthetic UI Audit fixture.
- No backend or native/App Store changes; pre-existing App Store materials were untouched.

## BodyGraph theme consistency and assessment sidebar cleanup
- Source 9047bf8742072fbf199a16d8f5c59ba68fe91715; artifact 6800b0ad00c23b2a85fbc45f96109c702f31f02e; rollback 45fa83c8070f09bb25e76f2f95cb3d8d48ec29eb.
- Pages run 36699723323 succeeded; fingerprint 476febe4d6edaf6c.
- BodyGraph centers, gate labels, tracks, active channels, arrows and legends now use the warm paper/sage theme. Design channels use warm brown; personality channels use deep sage. Geometry and calculations are unchanged.
- Removed only the assessment sidebar framework-source hyperlink in both languages; retained the methodology disclaimer.
- 36 focused tests passed; actual 1200px chart export visually reviewed. Public browser confirmed source version, sage legend, absence of the sidebar link in Chinese and English, and working question input.
