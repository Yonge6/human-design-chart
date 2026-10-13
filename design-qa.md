# Editorial redesign — selected option 1

final result: passed

Scope: local H5 design implementation. This is not production, native-device, AI-provider, or App Store release acceptance.

## Evidence
- Source visual truth: `/Users/yongyuan/.codex/generated_images/01a0c47a-a2c7-7f63-914a-ac13a9e87695/exec-5b60be20-aece-4d5e-8e76-64097c7c7f12.png`.
- Source dimensions: 853 × 1844; normalized to 390 × 844.
- Implementation: `http://127.0.0.1:8796/`, captured in in-app browser using a temporary 390 × 844 iframe (no product code viewport changes).
- Browser capture: 616 × 1173 at 1x. Crop x=113, y=0, width=390, height=844.
- State: Chinese, home, empty conversation, no saved manual.
- Implementation screenshot: `docs/design/editorial/mobile-home.png`.
- Combined normalized comparison: `docs/design/editorial/comparison.png` (source left, implementation right).
- Full-size side-by-side comparison exposes both headline/composer and lower supporting section at readable CSS scale, so separate magnified region files were not needed.

## Comparison and fixes
1. P2: inherited text shadows made headings fuzzy; removed them.
2. P2: metadata row displaced supporting content and hid the growth entry behind navigation; moved new-conversation action into the permission row and tightened spacing. Latest capture shows entry above bottom navigation.
3. P1: legacy drawer-local colors and membership backgrounds produced low contrast after theme switch; replaced local tokens and dialog surface/button selectors. Reopened personal page and consent dialog in browser and verified readable text and differentiated actions.
4. P2: legacy display declarations exposed the hidden report toggle without a report; restored hidden precedence. Latest accessibility state confirms it is absent.
5. Recaptured after WebP conversion; subject, clarity, layout and typography retained.

## Fidelity surfaces
- Typography: Chinese Songti display, system sans controls; reference two-line hierarchy retained. English headings and questions wrap without truncation.
- Rhythm: 22px mobile gutters; hero ends near 312px vs reference 306px, composer rule around 398px vs 397px, two ruled suggestions, compact context line, lower editorial section, bottom nav. Differences are minor P3 crop/spacing refinements.
- Colors: warm ivory, charcoal and sage; dark/glow chrome removed on reviewed screens. Native exported chart artwork remains a separate existing surface.
- Imagery: generated separate matching hero and journal images, served as optimized 57KB / 97KB WebP files. Retained supplied brand ring with grayscale treatment. Phosphor icons retained. Book placement differs slightly from concept; acceptable generated-asset variation.
- Copy: selected hero and composer copy implemented bilingually; empty-state daily thought matches design. Rotating suggestions remain real product data, so specific questions differ. Growth link says “建立” for a new profile; no fabricated completion status.

## Verification
- Passed build and 20 Buer conversation/growth/format/suggestion tests.
- Browser-tested language switch, suggested-question fill, three-tab navigation, membership consent opening/cancel, recovery after cancel.
- Inspected Chinese/English home at 390 × 844, growth route, personal page, consent dialog; desktop layout at 1200 × 900 through a scaled QA iframe.
- Local API credentials are absent; no claim of live AI provider verification. Console collection is not exposed by the CUA API used; automated tests and visible interaction checks passed, but console audit is not claimed.
- No deployment, native installation, or review submission performed in this design iteration.

## Follow-up polish / release checks
- P3: exact image crop and original ink-brush ring texture differ slightly from the concept.
- Before release: verify saved-report/manual states, native safe areas/system tabs, live AI, poster exports and legal pages under the new theme. This QA pass covers the selected homepage and shared navigation/consent surfaces, not an exhaustive release matrix.

## UI consistency follow-up (2026-09-26)
User-reported gaps expanded the audit beyond the initial homepage:
- Fixed scrolled header specificity that retained navy background.
- Fixed conversation history item/title/date/close/destructive action colors.
- Added shared ink, muted, surface, border, accent and danger tokens for dialogs and interaction states.
- Standardized growth primary buttons, actual aria-current tab selection, placeholder/focus/disabled states, settings labels and toggle track/thumb colors.
- Browser readback: populated conversation history; opening and cancelling clear confirmation without deleting data; growth route after scrolling; HUMAN 3.0; story form; privacy settings. Settings required an additional specificity fix; final readback confirms dark headings and sage/neutral switches.
- Palette contrast ratios on warm ivory: body 13.38:1, muted 4.97:1, danger 5.92:1; white on primary 6.11:1.
- Build and diff checks pass. This is local H5 verification; native-device and external legal/export surfaces are not newly certified.


# Companion brand — selected website option 2 (2026-09-30)

final result: passed

Scope: website visual redesign; existing conversation, profile permissions and growth flows retained. Native iOS/App Store are outside this release.

## Reference and comparison
- Approved logo: `/Users/yongyuan/.codex/generated_images/01a0c47a-a2c7-7f63-914a-ac13a9e87695/exec-7c602ea5-f793-46df-b1be-a680a075418d.png`.
- Selected website reference: `/Users/yongyuan/.codex/generated_images/01a0c47a-a2c7-7f63-914a-ac13a9e87695/exec-4ded5872-4ebf-4abf-8fa5-b3f37509dd0a.png` (1487 × 1058).
- Same-size implementation: `docs/design/companion/desktop.webp`, Chinese home, empty conversation, no saved manual; reference and final screenshot examined together in one image input.
- Mobile: 390 × 844, Chinese and English, screenshots alongside growth/profile/form/consent evidence under `docs/design/companion/`.

## Iteration history
1. P2 mascot crop: changed desktop illustration sizing to preserve hat and feet; mobile uses an independent 280px-high crop.
2. P2 brand lockup offset: restored explicit grid columns and removed inherited left padding.
3. P2 illustration boundary: blended the left edge into the sage surface.
4. P2 mobile English headline: narrowed its measure and adjusted font size to avoid the hat.
5. P2 English navigation and language wrapping: restored 15px desktop navigation and nonwrapping language controls; mobile toggle is 44px.
6. P2 confirmation actions: matched sage primary and outlined secondary styles, retained spacing and cancel behavior.
7. Converted illustration to 95KB WebP and recaptured. No unresolved P0/P1/P2 visual issues on the reviewed surfaces.

## Five visual surfaces
- Typography: serif headline and reflection text, system sans controls; consistent forest ink and readable muted text, independently tuned English mobile measure.
- Spacing: desktop top navigation, 590px sage hero, white inset composer, two-column supporting section. Mobile stacks composer below illustration and uses bottom navigation. Compact context controls without empty extra row when no manual exists.
- Colors: ivory, pale sage, forest ink, orange mascot and small accent icons; primary and secondary actions differentiated.
- Images: approved full-body logo retained; matching generated seated character for hero, optimized WebP. P3 variation: exact mascot pose/hat folds differ from concept.
- Copy: real rotating questions and real saved-report state retained. Empty-state thought and absent manual checkbox deliberately differ from the populated concept. No invented saved profile.

## Interaction and regression checks
- Browser: three navigation tabs, growth/assessment route, manual name input, history open/close, language switching, suggestion fills input, consent opens, cancel returns to an interactive home. No AI request sent in the visual check.
- No horizontal overflow in checked 390px / 1487px home states.
- Browser console: only Swiss Ephemeris initialization logs; no errors collected during checks.
- 38 existing targeted tests passed: public UI, growth, build security, daily tips and rotating suggestions. `git diff --check` clean.
- Daily-tip export palette/logo updated in source; live AI, native safe areas and actual poster download are not newly certified by this visual pass.
- Website deployment/readback tracked separately in `docs/deployments/companion-2026-09-30.md`.

Tablet follow-up: at 900 × 1000, reduced hero art to 80% height and composer to 52% width to keep the face clear, then blended the image top edge into the sage surface. No horizontal overflow.


## Header extensions and alignment corrections — 2026-09-30
- Fixed desktop language control: 44px container, 36px children, equal 58px columns; no overflowing selection background.
- Set both composer context labels and checkboxes to center alignment with identical line-height and zero checkbox margins.
- Growth now has a sage header with a new open-eyed writing pose. My Space uses the same structure in warm ivory with a waving pose; generated alpha preserved in optimized WebP assets.
- Reviewed Chinese desktop at 1280 × 900 and Chinese/English mobile at 390 × 844; no horizontal overflow or text/mascot overlap. Removed duplicated vertical padding above profile hero.
- 34 targeted public UI, growth and build security tests passed; diff check clean.
- Evidence: docs/design/companion/growth-header-desktop.webp and profile-header-en.webp.

## Paper Manual — selected option 1 (2026-10-13)

final result: passed

Scope: selected homepage visual direction and shared H5 content. This section supersedes the older sage/companion direction above. Native installation and public deployment have separate release readbacks; this visual result does not certify App Store publication or a new AI-response run.

### Reference and evidence

- Selected reference: `/Users/yongyuan/.codex/generated_images/01a12516-f0e6-7770-b73d-7c6acf91ddf0/exec-396652d7-31f4-49b4-915f-cca24278da0f.png`, 853 × 1844, normalized without distortion to 390 × 844 CSS pixels.
- Implemented existing product, not a standalone prototype: `http://127.0.0.1:8796/`, in-app browser at 390 × 844, 320 × 740, 430 × 932 and 1440 × 1000. Screenshots use 1 image pixel per CSS pixel; source density normalized only for comparison.
- Final Chinese homepage: `/Users/yongyuan/.codex/visualizations/2026/10/10/01a12516-f0e6-7770-b73d-7c6acf91ddf0/buer-paper-qa/12-home-zh-390-final.png`.
- Source-left / implementation-right comparison, inspected at full size: same directory, `21-source-vs-implementation-390.png` (796 × 844).
- Reviewed growth, My, guest People, privacy settings, membership dialog, English mobile and desktop. Evidence in the same directory: `09-growth-390-final.png`, `15-my-390-final.png`, `05-people-390.png`, `16-privacy-settings-390-final.png`, `17-membership-dialog-390-final.png`, `18-home-en-390-final.png`, `20-home-en-desktop-final.png`.
- Actual generated-and-downloaded privacy poster inspected: `/Users/yongyuan/Downloads/private-life-manual.png` (1200 × 3676); live chart/controls: `11-bodygraph-private-390-final.png`.
- `19-home-en-desktop-final.png` is a browser-wrapper clipped capture and is excluded; direct full-viewport capture 20 is the accepted desktop evidence.

### Comparison and corrections

1. P2: legacy hero/context animation faded text at entry; removed those animations and recaptured.
2. P2: inherited chart/print sage colors and dark export background were inconsistent with the selected blue paper identity; corrected chart toolbar, poster rules, planet columns and export canvas background, then generated an actual PNG.
3. P1 parity/privacy: legacy native selector hid the image privacy switch even after graph/save/share returned; explicitly restored it in the native stylesheet. H5 control was exercised and output visibly masks name, date, time and place. Native visibility is also covered by regression assertion.
4. P2: old native safety-area pseudo-element retained navy; aligned it with paper. Actual UIKit chrome is verified independently on device.
5. Release integrity: four new PNGs are intentionally explicitly tracked despite the repository-wide PNG ignore rule. Typeface OFL and Adobe metadata attribution bundled.

No unresolved P0/P1/P2 visual findings on the reviewed surfaces.

### Visual surfaces

- Typography: Noto Serif SC UI subset under `Buer Serif` alias, system Songti fallback for dynamic CJK, system sans for controls/body. Serif hierarchy and restrained blue-gray ink retained; English wraps without overlap. Reference's exact font drawing/boldness is a P3 variant, not a change of hierarchy.
- Spacing: 24px mobile gutters, open hero, subtle composer divider, 118px input, horizontal real suggestions, context row, full-width 54px primary action, separated quote area and four-item navigation. Main divider y≈294 vs reference y≈292; input/button offsets vary by 10–16px with real content and native-size controls.
- Color: flat warm paper #f7f4ec, blue-gray #23333d, blue-leaning teal #367e8c. Reference paper texture/soft gradient omitted intentionally for crisp content and native system materials. Body/muted/controls remain distinct.
- Imagery: separate transparent new mascot assets, not a screenshot cropped into the UI. Hat and clothing are blue-leaning cyan/teal. Same identity is used for hero, avatars, icon, launch asset and exports. P3 generated pose/scale variation remains, with no green hat.
- Copy: real rotating welcome/questions and saved-profile daily quote are retained. The static reference's two suggestions and one-line sample quote are not fabricated product state; real long text remains scrollable. Growth/manual entry reflects existing local saved state. App-specific purchases remain in system StoreKit, not an invented H5 checkout.

### Interactions and quality checks

- Exercised four navigation entries, Chinese/English switching, suggestion-to-textbox filling and manual overview-to-chart tabs.
- External primary button remains a true form submit control via `form="buerChatForm"`; regression test verifies association. No production chat or new personal record was submitted in visual QA.
- Opened privacy settings and membership dialog; closed dialog and verified usable home after dismissal. No deletion, account sign-out or subscription purchase performed.
- Checked existing chart and privacy switch; waited for render completion, used Save Image and inspected the resulting full PNG. Existing renderer math/topology unchanged.
- Read-only DOM checks show document width equals viewport at 320 and 1440; screenshots at 390 and 430 show no horizontal page overflow. Suggestion row remains intentionally independently scrollable.
- Browser warning/error collection is empty after these checks. Unit results and native/public release evidence are tracked separately.
- Product remains a shared hybrid App/H5. UIKit supplies actual system tabs, page sheets, pickers and share surfaces; the content is not claimed to be fully SwiftUI-native.

### Native follow-up typography (2026-10-13)

- Actual iPhone 14 Pro Max installation and launch exposed P2 mixed CJK typography in the My title: the first small font subset omitted `，积累属`, and iOS did not have the Mac-only serif fallback. The issue was not visible in desktop H5 screenshots.
- Replaced that 182-glyph static font with a real variable Noto Serif SC subset (wght 200–900), covering all static product characters plus GB2312 level-one common characters. 3782 required characters have zero missing glyphs; cmap contains 4348 mappings. Different outlines at weights 400, 500 and 600 verified.
- Browser uses the compressed WOFF2 (1,464,236 bytes), with TTF retained as the source artifact. Old font backed up separately. Original OFL retained and notices updated to describe local subsetting.
- Aligned drawer-local ink/muted variables and first-load preview colors with the final paper/blue tokens; no business state or layout flow changed.
