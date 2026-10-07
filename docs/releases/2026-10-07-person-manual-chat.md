# Person manuals and direct relationship chat

## Released

- Source: `11bbf85582404f90a1a7ea15fdb5e5c57d00cf22`
- H5 artifact: `2686185233a69a7429ad80aea8b469b306edba53`
- Pages deployment: `37612490016`, completed successfully.
- Public runtime at https://buer.wonderelian.com/ independently returned the source commit.
- Asset fingerprint: `68b334d0970352c2`.

## Behavior

- Person detail now offers a Life Manual: overview, existing detailed reading chapters and celebrity comparison, and the complete rendered BodyGraph with Design/Personality activations.
- Calculation is isolated from the main chart and history. It reproduces the stored chart hash, including the exact repeated-DST instant. Version mismatches require resaving rather than showing inconsistent results.
- Chat opens at the composer. Context controls, sources and conversation history are collapsed.
- New contexts default to all account-owned sources, persisted only on first send after AI consent. Existing disabled scopes remain disabled. Local-only chart/growth/history still require the existing ownership-confirmed synchronization; no automatic local import or unrelated-person context was added.

## Verification

- `node --test tests/*.test.mjs`: 201 passed, 0 failed.
- `git diff --check`: clean.
- Browser checks at 390x844 and 1176x1173: manual chapters and SVG display, no horizontal dialog overflow, immediate chat composer, closed settings.
- Public-page browser fixture: 14 core chapters, actual SVG, Chinese planet labels; main BodyGraph and localStorage unchanged. Production callback additionally appends the existing celebrity comparison section.
- New-context fixture: all four scopes enabled, no writes on opening.
- Existing-context fixture: chart/growth enabled, journal/history disabled and not silently enabled.
- UI fixtures replaced the account transport in the test tab only; no real account records were created and no paid AI request was sent. This was not a fresh real-account AI round-trip test.
- Browser TaskSpace 16 finished and closed.

## Boundaries

This release changes H5 only. No new native binary, App Store submission, API deployment, or database migration was performed.
