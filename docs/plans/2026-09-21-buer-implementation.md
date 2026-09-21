# 不二 · 人生使用说明书 — option 3 implementation

## Scope and preview

Implemented on `codex/buer-ui-redesign` in the separate `buer-life-manual` worktree. The original checkout remains on `codex/wechat-daily-image-live` at `a52f6ba`; no deployment or App Store action was performed.

Preview: http://127.0.0.1:8798/

The selected reference is `design-exploration/concept-03.png`. The homepage now centers conversation, with a daily thought and existing Life Manual entry beside it. Phone uses bottom navigation; tablet retains the split view. Existing calculation, historical H5 chart, native text result, daily tip and image-sharing logic remain available.

## Conversation

`src/app/buer-home.js` implements suggested questions, streamed responses, stopping, retry, copy, new conversation and local conversation history. Report context is opt-in and limited to Type, Strategy, Inner Authority and Profile. Names and birth details are not attached automatically. User-entered questions are sent as written. Local chat history is separate from the existing Life Manual history setting.

`api/chat.mjs` proxies DeepSeek from the server. It validates roles and sizes, sanitizes provider errors, limits concurrency and request frequency, aborts disconnected streams, and refuses to label truncated replies as complete. The API key is never part of a frontend configuration. Both the existing API server and local preview server expose this handler.

Provider defaults were checked against https://api-docs.deepseek.com/ on 2026-09-21. Default model is `deepseek-v4-pro`, using non-thinking streamed chat completions. Optional server configuration is in `.env.example`.

## Local setup

Use Node 22 or newer. Run `npm ci`, then `npm run build`. Put an authorized `DEEPSEEK_API_KEY` in ignored `.env.local` using a secure local editor; do not paste it into chat. Optional `DEEPSEEK_MODEL` and `DEEPSEEK_BASE_URL` are server-only. The base URL is constrained to the official HTTPS origin. Start with `PORT=8798 npm run dev` and restart after environment changes.

As of this handoff, no key has been copied or configured. A pending user question offers reuse of the existing Wendao server configuration or a separate Buer key. `/v1/chat/status` returns `configured:false`; sending a question returns a truthful 503 `AI_NOT_CONFIGURED`. Mocked provider tests do not establish real connectivity.

Deployment is not part of this branch handoff. Any later release needs the API route hosted with the authorized server environment, the frontend pointed at that service, and a real provider smoke test. Native archive/device testing and App Store submission were not performed. In-process request limits use socket addresses; production proxy integration requires review before exposing the paid endpoint publicly.

## Assets

- `assets/buer-aurora-hero.webp`: generated optical loop over a midnight lake, 2216 × 709.
- `assets/buer-ai-orb.webp`: generated cyan/lavender loop avatar, 512 × 512.
- `vendor/phosphor/`: MIT-licensed Phosphor icon font, attribution in `THIRD_PARTY_NOTICES.md`.
- Daily poster uses the new branding and avatar. The QR still points at the existing site until a new public destination is selected.

## Validation

- `npm test`: 126 tests passed; H5 historical asset guard and native exclusion/sync checks passed.
- API unit/integration tests use a stubbed provider for stream success, truncated streams, sanitized errors, concurrency/rate limits, UTF-8 chunks, private-field filtering and corrupt stored data.
- In-app browser: desktop 1440 × 1024, phone 390 × 844 and 375 × 812, iPad 834 × 1194; no horizontal viewport overflow at checked sizes. Small-phone send button ends at y=570, above the bottom navigation at y=747.
- Synthetic name/date/location entered through the existing flow; generated result and daily advice verified. Conversation history/retry/new chat, English layout and QR poster rendered successfully.
- Browser console inspection returned no error/warning entries after final interactions. Expected unconfigured-provider error is shown in the UI.
- Real DeepSeek responses, physical device keyboard behavior, system photo saving and App Store state are not verified by these browser checks.

See `design-qa.md` and `qa/buer-redesign/` for visual evidence.

## Independent public H5 preview — 2026-09-22

- Public URL: https://yonge6.github.io/buer-life-manual-preview/?v=b7612f3
- Dedicated artifact repository: https://github.com/Yonge6/buer-life-manual-preview
- Source commit: `b7612f38d896a98a7302f0bd169e6dd1278b7e2a` on the existing isolated source branch.
- Pages run: https://github.com/Yonge6/buer-life-manual-preview/actions/runs/35632049112 — success. HTTPS enforced, no custom domain; original Pages/site settings were not changed.
- Rebuild with `node scripts/build-buer-preview.mjs`. This explicitly disables AI, clears remote backend configuration, uses noindex discovery metadata, includes the source link/license, and gives the daily poster a QR for the independent preview URL.
- Public acceptance: HTTP 200; eight critical assets matched local SHA-256; real synthetic-input calculation completed; saved result reopened; returning from step 3 preserved daily-tip visibility; daily PNG poster rendered; AI displayed the expected unconfigured message. At 390px, document width was 390px, visible images loaded, and console warnings/errors were empty.
- The live test caught and fixed legacy form logic hiding the homepage's relocated daily card. Focused regression suite: 27 tests passed. Earlier preview/chat/security/daily tests: 16 passed.
- Evidence: `qa/buer-redesign/live-assets.json`, `live-mobile.png`, `live-share.png`.
- This is a functional static H5 preview. Real AI still requires an authorized server credential and API deployment; Pages itself does not execute the Node handler. Physical WeChat Photos behavior was not verified.
