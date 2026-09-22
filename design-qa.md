# 不二 option 3 — implementation QA

## Life Manual integration — 2026-09-22

Manual integration result: passed. Real AI provider acceptance remains blocked as described below.

The selected homepage direction now extends through the birth form, result overview, 15 reading chapters, and original BodyGraph. Shared navigation, typography, navy surfaces, cyan controls and optical artwork connect the screens. The manual is a different screen from the homepage concept: fidelity is evaluated against the shared visual system, not identical positioning of different content.

Evidence: `manual-before.png` records the previous public gold result; `manual-overview-desktop.png` (1440 × 1024), `manual-overview-mobile.png` and `manual-reading-mobile.png` (390 × 844), `manual-form-mobile.png` (390 × 844, step 2), and `manual-ipad.png` / `manual-ipad-english.png` (1024 × 1366). Browser content at DPR 1. Concept 03, desktop overview and mobile overview were opened together in one comparison input; remaining states were inspected separately. No remaining actionable P0/P1/P2 visual findings in these checked states.

Resolved findings:

- [P1] Newly generated result could read the previous record for the manual title/chapters because rendering precedes assignment to application state. The result event now carries the exact rendered data; generating a fresh synthetic record immediately shows the correct title and chapters.
- [P2] Legacy gold form/date/button rules leaked into the new theme. Unified actual date/time wrappers, focus states, secondary buttons and step spacing; reduced repeated introductory content on mobile steps 2 and 3.
- [P2] The old summary was hidden and detailed text opened an unrelated modal. Exposed core configuration, added overview/reading/chart tabs and 15 inline accordion chapters, preserving the original chart asset in its own tab.
- [P2] Manual and home had disconnected actions. Topic/chapter actions now seed a draft and explicitly select only the four anonymous report fields; the user still sends the request. Daily-tip action returns to the visible home card. Restoring an unrelated conversation clears the previous report override.

In-app browser verified: three-step calculation, current-result title, overview and reading tabs, original chart loading, chapter-to-conversation draft/context, daily-tip navigation, Chinese/English and iPad width (1024 document width = viewport width), mobile layout, and empty final console warning/error readback. Keyboard tab navigation is implemented with roving tabindex and Arrow/Home/End handlers. Physical device keyboard, Photos/WeChat system actions and native release were not tested in this scope.

This iteration updates only the isolated redesign branch and its independent H5 preview. Original production remains outside the deployment scope.

Public acceptance: source `6ffda8b`, artifact `b83e3e5`, Pages run `35634530023` succeeded. https://yonge6.github.io/buer-life-manual-preview/?v=6ffda8b was independently opened and verified: new manual tabs, 15 chapters, current saved result, question draft with explicit report context, 390px document width equal to viewport, and no console warnings/errors. All seven critical public files match the local built artifacts (`manual-live-assets.json`). Screenshots: `manual-live-mobile.png` (390 × 844) and `manual-live-desktop.png` (1769 × 1170). Final suite: 126 tests passed; H5 historical SVG and native asset guards passed. Keyboard ArrowRight tab selection also passed locally. Original checkout remains clean at `a52f6ba`.

final result: passed (2026-09-22 live AI acceptance)

The visual implementation has no remaining actionable P0/P1/P2 layout findings in the checked states. The original AI configuration blocker was resolved on 2026-09-22 with a dedicated provider key and a real streamed reply in the public browser. Earlier blocked notes below are historical.

## Evidence and normalization

- Source visual truth: `design-exploration/concept-03.png`, 1487 × 1058 pixels, unframed generated desktop concept.
- Implementation: http://127.0.0.1:8798/; `qa/buer-redesign/desktop-home.png`, 1440 × 1024 pixels, 1440 × 1024 CSS px, DPR 1.
- The images have effectively the same aspect ratio; source is judged at approximately 0.968 scale. Both were opened together in the same comparison input on the initial and final desktop review.
- State difference: reference contains an illustrative two-message exchange and short example tip. Implementation uses an honest empty conversation and a real synthetic test result's longer daily tip. Actual user/error bubbles are recorded in `desktop-error.png`; no sample reply is presented as live AI.
- Other captures: `mobile-home.png` and `mobile-error.png` (390 × 844); `mobile-small.png` (375 × 812); `ipad-home.png`, `ipad-english.png`, `ipad-share.png` (834 × 1194). All browser content screenshots at DPR 1, without simulated phone chrome.
- Focused crops were unnecessary: the heading, message/avatar, composer, date/tip and manual entry remained readable in the full-size paired images. Mobile, tablet, English and share states were also inspected individually.

## Findings and iteration history

1. [P2, fixed] Inherited heading max-width caused incorrect centering/wrapping. Removed the legacy width constraint and introduced tablet/English wrapping. Evidence: final desktop and iPad captures.
2. [P2, fixed] Automatic input focus scrolled the desktop header out of view; mobile error state pushed input controls toward bottom navigation. Post-response focus now avoids scrolling and is omitted on phone; mobile welcome/message/composer spacing was reduced. Evidence: `desktop-home.png`, `mobile-home.png`, `mobile-small.png`; 375px send bottom 570 < navigation top 747.
3. [P2, fixed] Longer actual daily copy pushed the desktop manual/context beyond the viewport. Reduced tip size to 27px, sidebar gaps and manual section spacing. Final desktop document height and width equal 1024 and 1440 respectively.
4. [P2, fixed] Timer refresh reverted the designed compact date to legacy long form. Date formatting is now consistent in the source refresh path.
5. [P2, fixed] Error bubble used generic connection copy even when the provider was unconfigured. Bubble and status now preserve the specific error, including after history restoration.
6. [P1, blocked] Real AI request cannot complete without the chosen server credential. User selection of existing Wendao configuration versus a separate key is pending. Fix: configure authorized server environment, restart, verify a real streamed reply and cancellation. No placeholder answers are supplied.

Initial desktop evidence: `desktop-before.png` (local diagnostic capture, scrolled state, not used for final acceptance). Revised and final comparisons used the same 1440 × 1024 desktop viewport at scroll zero. Final screenshot comparison followed the typography, hero crop/fade, sidebar spacing and focus fixes.

## Required fidelity surfaces

- Typography: Songti-style Chinese display hierarchy and system sans UI retain the selected direction. Actual platform fallback rather than a fabricated embedded font; tablet/English wrapping checked. Source image has slightly different glyph rendering, classified P3.
- Spacing/layout: slim fixed rail, atmospheric top image, large centered prompt, broad low composer and separated daily/manual sidebar retained. Report opt-in and processing note add functional lines below the composer. Mobile moves secondary material below conversation; desktop/iPad retain columns.
- Colors/tokens: near-black navy `#080e1b`, soft white text, muted blue secondary text and cyan `#7cdeff` accents. Error outline has a restrained semantic tint. Visible focus states provided.
- Assets: actual generated raster hero/avatar used, not CSS drawings. Hero cropped and lower edge faded. Phosphor library icons replace concept icons. Distinct generated loop shape/crop is acceptable art-direction variation, P3.
- Copy: original brand replaced in visible homepage/share/legal/support surfaces. Daily advice is actual result-based content; conversation welcome explicitly serves as empty state. Error, stop and retry copy do not imply an AI response was received.

## Interactions and gaps

Verified in the in-app browser: legacy birth form and result using synthetic data, daily tip, QR share dialog, question suggestion/send, missing-config error, retry without duplicated user question, history restore, new conversation, and Chinese/English switching. Final console error/warning readback was empty. Automated tests: 126 passing plus H5/native asset guards.

Not verified: real provider response, physical iPad/iPhone keyboard, system Photos/WeChat actions, native archive or App Store review. Legacy browser CLI E2E suite was not run; UI validation used the required in-app browser.

## Implementation checklist

- [x] Selected option implemented in isolated branch.
- [x] Desktop/mobile/tablet and major UI states inspected.
- [x] Original chart/calculation preserved and asset guards passed.
- [x] Server-only API integration, streaming/error/privacy tests.
- [ ] Authorized DeepSeek configuration and real provider acceptance.
- [ ] Deployment only after a separate release request.

## Public H5 addendum — 2026-09-22

Independent preview is live at https://yonge6.github.io/buer-life-manual-preview/?v=b7612f3 (source `b7612f3`). Static H5 deployment acceptance passed: public HTTP/asset readback, actual calculation, daily advice and PNG/QR rendering, 390px overflow check and empty browser console. Live evidence is in `qa/buer-redesign/live-assets.json`, `live-mobile.png`, and `live-share.png`. Legacy form-driven hiding of the relocated daily card was found during live flow verification, removed, republished and retested. The overall AI readiness blocker above remains explicit; the static preview disables AI requests rather than returning a simulated answer.


## Brand rename — 2026-09-22

Product name is now 不二见己 (English: Buer Jianji). Life Manual remains the feature name. Updated home/navigation, document and sharing titles, daily poster artwork text, about/settings/legal/support copy, AI system identity, source README and preview README. App/Widget display names and Widget empty/footer copy are synchronized in source; bundle identifiers, storage keys and deep links remain compatible. This is not an App Store submission.

Local validation: Chinese daily share image inspected, English title confirmed, 390px home has no horizontal overflow. 126 tests and H5/native asset guards passed; App and Widget plist syntax passed. Original chart and original project are preserved.

Public rename acceptance: source `1ea0af1`, Pages run `35658156262` succeeded. Public document title and header show 不二见己; mobile PNG share card shows the new brand above and below the advice with its preview QR. Nine critical public files match local build bytes (`jianji-live-assets.json`), 390px width check passes, and console warnings/errors are empty. Evidence: `jianji-live-share.png`.


## Live AI and mobile language follow-up — 2026-09-22

Dedicated DeepSeek Flash API is now live through HTTPS at buer-api.wonderelian.com. A real question sent from the public homepage received a complete Chinese response, with the send control restored and no error. Key is server-only, public bundle secret scan passed, permitted CORS preflight passed and unrelated origin was rejected. Mobile language follows the inspected Wendao header: EN in Chinese, 中文 in English, directly visible beside the menu. The 390px local view and both switching directions pass without overflow (`mobile-language.png`). See `docs/deployments/buer-ai.md`.

Live final acceptance: 390px public EN/中文 switching, actual English provider reply, and immediate stop restoring input all passed. Removed per-message fade after observing it replay on stream deltas and obscure text. Final code source `5f43245`; server remains the dedicated systemd service. Evidence: `live-ai-english-mobile.png` records the pre-fix fade finding, `live-ai-assets.json` records final artifact readback.
