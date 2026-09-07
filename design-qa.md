# Pluto Quiet Night Journal — design QA

Source visual truth: `qa/2026-09-07/selected-reference.png` (user selected the first displayed Product Design image).
Implementation: `http://127.0.0.1:8794/`; screenshot `qa/2026-09-07/home-final.png`.
Viewport and state: 390 × 844 CSS px, Chinese, dark theme, latest saved test result, daily advice ready, first form step. Source 853 × 1845 px was normalized to 390 × 844; implementation 390 × 844 at 1×. No browser chrome in the comparison.
Full-view evidence: `qa/2026-09-07/home-comparison-final.png` contains the reference on the left and implementation on the right. Focus evidence: `qa/2026-09-07/home-comparison-focus.png`; the final full view also makes typography and controls readable at 1×.

## Findings and comparison history

1. `home-comparison-1.png`: P1 missing moon image, P2 bold display fallback and quote/form displaced downward, P2 redundant home history action and footer outside the target fold. Generated a dedicated moon asset with built-in Image Gen, restored a light serif, compacted the heading/action layout, removed the redundant home action (history remains in the menu), and adjusted mobile rhythm.
2. `home-comparison-2.png`: P2 share action's inherited minimum height still expanded the heading. Positioned the new share action independently with a 44 px hit target; restored the reference's quote wrapping and section divider. Matched the input/continue heights and reduced borders to single outlines.
3. Final combined comparison: no remaining actionable P0/P1/P2 differences. Moon sizing corrected using the real generated asset; light compositing removes its darker rectangular background without drawing replacement art.
4. Share dialog: P2 inherited full-width close control wrapped the title. Fixed flex sizing; verified both mobile browser and the actual iPad simulator share sheet. Poster line wrapping now preserves the sample advice's three readable clauses. Final PNG reviewed and QR decoded successfully.

## Required fidelity surfaces

- Fonts/typography: light Songti/STSong/Noto Serif fallback for Chinese display copy, Georgia brand, system sans-serif controls; 29 px/1.5 mobile quote. Three-line sample matches the source. iPad uses larger readable type. Fallback glyph rendering differs slightly by browser/OS and is an accepted platform difference.
- Spacing/layout: 76 px header, 28 px mobile gutters, matching main section divider, 48–52 px primary controls. Phone stays single-column, iPad home becomes two columns. 320 px and 768 px home checks found no horizontal overflow; native result coverage spans 320, 390, 768, 1024, 1366 px.
- Colors/tokens: #100e14 background, warm ivory text and muted gold controls. Solid button/background treatment is a minor P3 simplification of the generated reference's subtle texture. Contrast and hierarchy remain intact.
- Image quality: real generated gold crescent asset, no placeholder or handmade replacement. Share card uses the same asset; QR is the existing verified source image with its quiet zone. No BodyGraph is present in native results or native packaged assets.
- Copy/content: daily suggestion uses the latest saved result and local calendar date. English/Chinese and empty states work. User-requested “分享图片” is an intentional addition to the selected mock. No birth details or names appear on daily share cards. H5 preserves the historical BodyGraph instead of combining drawing systems.

## Interaction evidence

- 113 Node tests passed, including daily selection/privacy and existing calculation/schema tests.
- 24 browser E2E tests passed. Includes history opt-out, translations, real local calculation, restored H5 assets, native graph-free results, widget payload/deep-link callback, and PNG save/native share bridge calls. After final visual compositing, the dedicated share E2E passed again.
- Standalone Swift daily-date tests passed, including Shanghai, UTC and DST behavior.
- H5 historical SVG SHA verified; both native output and synced iOS public assets omit graph templates/geometry.
- Actual iPad simulator: completed form and calculation, read text results, opened daily-tip URL to the latest reading, generated share card, opened system share popover with a PNG attachment, and verified portrait/landscape home layout.
- `ipad-native-share.jpg` shows the actual iOS share popover. `ipad-native-landscape.jpg` shows landscape home. `home-ipad-en.png` shows English iPad layout. `h5-restored-bodygraph.png` shows the rendered historical H5 graph.
- `daily-tip-share-zh.png`: 1080 × 1440 exported PNG. Apple Vision decoded the bottom-right QR as `https://human-design.wonderelian.com/`.
- Final E2E console/module/asset checks passed. Initial moon 404s were resolved before final acceptance.

## Remaining verification boundaries

WidgetKit extension compiles and embeds successfully, and the real simulator App Group contains the versioned advice payload. Timeline selection and JS/Swift bridge are verified. Adding the widget to SpringBoard and physical-device WidgetKit refresh have not been manually verified. Distribution App Group registration/provisioning remains a release check. No distribution signing, upload, deployment, push, merge, or App Store Connect changes occurred. Simulator builds used local ad-hoc signing only to enable App Group testing.

## Follow-up polish

P3: source's small ornamental separator/arrow cues are omitted; generated crescent texture and font rasterization differ slightly. These do not affect core content, hierarchy or controls.

## Implementation checklist

- [x] Selected concept 1 implemented and compared in the same input.
- [x] Daily home advice, sharing PNG, QR and native sharing functional.
- [x] Phone and iPad responsive states verified.
- [x] H5 historical graph isolated from native text-only results.
- [x] Build, source provenance isolation, unit and E2E verification passed.
- [ ] Physical device / SpringBoard widget acceptance and distribution provisioning during release.

final result: passed
