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
