# Daily tips, iPad, and platform-specific results

Scope authorized September 7, 2026: restore the historical H5 BodyGraph, show text results without a BodyGraph in the native app, support iPad, and add daily-life-advice Home Screen widgets based on the most recently saved result.

## Implementation

- Restore the historical SVG and matching renderer from `7f19da8`. Keep H5 and native build outputs separate. Exclude both BodyGraph templates and all graph geometry from the native bundle; its renderer is a no-op. Do not mix the two drawing systems.
- Native results expose the existing accessible summary, three strengths, and detailed reading. Hide image previews, photo export, and image privacy settings. Preserve text sharing, calculation, and history.
- Small/medium WidgetKit widgets show one locally selected daily suggestion in the app language. Share only a versioned advice list (no name, birth details, or chart) through an App Group. Refresh when saved history or language changes; clear shared content when history is disabled or empty. The widget opens a daily-tip section of the latest saved manual.
- Enable iPhone/iPad device families and all iPad orientations. Use readable responsive widths, safe areas, and layout that works in narrow windows.

## Verification

- Test tip selection, missing data, language, and persistence boundaries.
- Build H5 and native separately; enforce exact restored H5 SVG hash and absence of graph assets in native output and copied public assets.
- Verify web and native-mode results at phone and iPad widths, including native generation when image assets fail.
- Compile unsigned simulator app plus widget extension; check packaged device families, extension, and entitlements. Run appropriate existing tests.

## Release boundary

The initial implementation stopped before deployment. The user subsequently authorized H5 production release with “上线”; this authorizes the scoped commit, PR merge and manual Pages deployment. App Store Connect, distribution archive upload and the submitted native build remain outside this H5 release. App Group registration and distribution provisioning must be verified during the separately authorized release. Historical visual provenance classification remains DERIVED_OR_UNCLEAR; restoring it does not change that classification.

The user additionally requested a daily-tip card on both H5 and App homepages. Reuse the same offline advice pool and local calendar-day selection as WidgetKit; include empty-state onboarding and a link to the latest saved reading.

## Product Design: selected option 1

The user selected the first displayed image, now preserved at `qa/2026-09-07/selected-reference.png`. Implemented the dark, warm-gold Quiet Night Journal layout on H5 and native home, responsive iPad columns, text-result presentation and matching WidgetKit colors. The generated crescent asset is `assets/pluto-daily-moon.webp`.

The user subsequently requested daily-tip share images with a bottom-right QR. Implemented a standalone 1080 × 1440 PNG renderer, preview dialog, download/save and native system image sharing. The card has current date/advice/Pluto branding, excludes personal inputs, and reuses the QR verified to open https://human-design.wonderelian.com/. It does not depend on BodyGraph or html2canvas in the native bundle.

## Completed verification

113 Node tests and 24 E2E tests passed. The final cosmetic change was followed by a passing targeted share E2E. Swift date/timezone/DST tests and historical-H5/native-asset segregation guards passed. Native App and WidgetKit extension build successfully with iPhone+iPad device families. A dedicated iPad simulator completed generation and text results, wrote advice to the actual App Group, handled the widget deep link, opened the actual iOS share sheet with PNG, and displayed portrait/landscape layouts correctly. Apple Vision decoded the exported share-card QR to the expected public H5 URL.

Product Design QA passed after reference/render comparison iterations; see root `design-qa.md`. Screenshots and the real exported share PNG are under `qa/2026-09-07/`.

## Remaining verification at the initial implementation gate

SpringBoard widget placement and real-device timeline refresh are not manually verified. Distribution App Group registration and provisioning must be checked when releasing. No production deployment, git push/commit/merge, distribution archive signing/upload, or App Store Connect change occurred. Simulator-only ad-hoc signing was used for shared-container verification; no developer credentials or profiles were changed.

## Native release authorization — 2026-09-08

The user explicitly requested withdrawal of the waiting App Store version, a new binary, refreshed iPhone/iPad screenshots, and App Review resubmission. Version 1.1.0 build 6 is prepared for that scope. Build 5 was superseded after native screenshot QA found that reading and share dialogs needed explicit device safe-area insets. This supersedes the earlier H5-only authorization boundary. Release notes and screenshots must describe native text results and daily tip sharing; the native binary excludes all BodyGraph artwork.
