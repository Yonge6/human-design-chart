# 不二 option 3 — implementation QA

final result: blocked

The visual implementation has no remaining actionable P0/P1/P2 layout findings in the checked states. End-to-end AI readiness is blocked by the pending choice/configuration of the server-side DeepSeek key. No provider success is claimed from mocked tests.

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
