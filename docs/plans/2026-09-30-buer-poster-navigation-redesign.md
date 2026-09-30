# Buer Poster and Navigation Redesign Implementation Plan

Status: implemented; local bilingual export, navigation, privacy download and responsive checks passed. Release evidence is recorded in deployment notes.

**Goal:** Unify both exported images and the chart loading state with the current warm editorial Buer identity, while making the Life Manual back button return to the previous in-app page.

**Architecture:** Keep all chart data, BodyGraph rendering, privacy behavior, QR codes, download and share plumbing unchanged. Redesign the daily-tip canvas in `src/renderer/daily-tip-poster.js`, restyle the existing hidden `#capture` DOM poster and visible `.preview-stage` in the final `buer-companion.css` theme layer, and record the prior workspace before opening the manual so `.buer-back-home` can restore it safely. Standardize personal-space card titles at 16px and supporting copy at 14px.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, DOM/CSS, html2canvas, Node test runner, Playwright/Ego browser QA.

---

### Task 1: Previous-page navigation

**Files:**
- Modify: `app.js`
- Modify: `src/app/buer-manual.js`
- Modify: `index.html`
- Test: `tests/public-ui.test.mjs`

**Steps:**
1. Add a failing source-contract test for bilingual `backPrevious` copy and a history-safe internal return handler.
2. Track the last non-manual workspace before opening the Life Manual.
3. Change the visible label to `返回上一页` / `Back` and restore the previous workspace; fall back to Home when no valid source exists.
4. Run the focused public UI and growth tests.

### Task 2: Daily-tip share image

**Files:**
- Modify: `src/renderer/daily-tip-poster.js`
- Test: `tests/public-ui.test.mjs`
- Verify: `tests/e2e/product-hardening.spec.mjs`

**Steps:**
1. Add source-contract checks for the warm-paper palette and labeled editorial regions.
2. Replace the faded full-width hero with a restrained upper-right companion vignette.
3. Use a compact date rail, a high-contrast quote area, a small orange editorial accent and a structured brand/QR footer.
4. Preserve the 1080 × 1440 PNG, bilingual wrapping, white QR quiet zone and current share/save APIs.
5. Generate Chinese and English browser previews and inspect both at full resolution.

### Task 3: Life Manual poster and loading state

**Files:**
- Modify: `buer-manual.css`
- Modify: `index.html`
- Test: `tests/public-ui.test.mjs`
- Verify: `tests/e2e/product-hardening.spec.mjs`

**Steps:**
1. Add failing checks for the light editorial export palette and branded loading-state structure.
2. Restyle `#capture` with ivory paper, sage rules and cards, dark readable type, and restrained lavender/orange BodyGraph accents.
3. Preserve the BodyGraph geometry, planet lists, interpretation, properties, QR code and privacy substitutions.
4. Redesign `.preview-stage` loading/error states as a warm paper skeleton with the existing companion mark and accessible live status.
5. Render representative Chinese and English posters and confirm no clipping or horizontal overflow.

### Task 4: Release verification

**Files:**
- Modify: `docs/deployments/companion-2026-09-30.md`

**Steps:**
1. Run focused tests, full relevant browser tests, production build and `git diff --check`.
2. Commit source changes without touching the existing untracked App Store materials.
3. Publish the generated `dist` tree to `Yonge6/buer-life-manual-preview` and wait for GitHub Pages success.
4. Verify public source commit/fingerprint, exact key-resource hashes, previous-page behavior, both generated-image previews and responsive layout.
5. Record source, artifact, rollback and Pages run identifiers.
