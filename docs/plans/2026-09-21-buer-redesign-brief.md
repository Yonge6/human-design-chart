# 不二·人生使用说明书 — redesign brief

Status: option 3 selected by the user and implemented in the isolated branch. UI preview verified; real DeepSeek validation awaits the pending server credential choice.

## Isolation

- New branch: `codex/buer-ui-redesign`.
- Separate checkout: `/Users/yongyuan/.codex/worktrees/e3fe/buer-life-manual`.
- Base: `4838d4d` (current fetched main, includes the existing analytics fix).
- Original checkout and `codex/wechat-daily-image-live` are retained unchanged.
- This request does not publish over the existing site or change App Store submissions.

## User requirements

- Rename the new experience to **不二·人生使用说明书**.
- Redesign UI and interactions with a cooler, more striking visual character.
- Add an AI conversation composer to the homepage, similar to 三慢问道, connected to DeepSeek.
- Preserve existing functionality: birth-information flow, calculation and reading, daily advice, image sharing with bottom-right QR, history, languages, iPhone/iPad support, and daily-tip Widgets.
- Keep the historical H5 BodyGraph rendering isolated; native results stay text-first.

## Observed reference

Captured current production homepage and Wendao's conversation panel in `design-exploration/`. The latter opens beside reading on desktop. The live panel requires login; no login or paid request was performed. Its local source was inspected to understand the actual conversation UI beyond the login state.

Read-only source references:
- `/Users/yongyuan/Documents/道德经/wendao-adaptive/src/companion/CompanionPanel.tsx`: composer, suggestions, streaming states, stop, retry, copy, and image sharing.
- `/Users/yongyuan/Documents/道德经/wendao-adaptive/src/companion/api.ts`: server event-stream client and interruption/error handling.
- `/Users/yongyuan/Documents/道德经/wendao-adaptive/api/_lib/providers/deepseek.mjs`: server-side provider adapter.

No Wendao files were modified. Its billing, account database, chapter prompts and credentials must not be silently copied or reused.

## Proposed interaction

Homepage presents one main action: ask the AI a question about the user's concrete situation. Daily advice and the life manual are supporting entries. Sending opens/continues a persistent conversation without discarding an unfinished question. Responses progressively appear, with clear stop/retry states. Desktop/iPad can retain contextual reading beside chat; phone gives conversation and keyboard a dedicated usable surface.

DeepSeek requests must go through a server-side endpoint; the key stays out of frontend bundles and version control. Verify current official provider parameters during implementation. Adapt the persona to self-reflection and the life manual, not Wendao's Tao Te Ching persona. Linking a report to a conversation should be explicit and avoid sending name or birth details by default. The provider is not connected yet.

## Visual selection

Three independently generated 1440 × 1024 homepage concepts explore different hierarchies: a sculptural dark entry, an eastern-futurist light split view, and an immersive conversation workspace. Each includes the homepage AI input and supports later phone/iPad adaptation. Selection numbers must follow actual image display order in the chat.
