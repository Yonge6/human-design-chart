# People workspace release — 2026-10-06

- Source: `e35f6ed4357116509b75eed291a268eb0af8be84`.
- H5 artifact: `66fd48f`, fingerprint `4dc387c5c919ecd7`; Pages run `37487322116` succeeded. Public runtime-config read back the source commit.
- API: `/srv/buer-jianji/releases/20261006-people-e35f6ed`; `/v1/chat/status` returned configured true. Previous release retained.
- Migration `202610060002_people_context.sql` applied. Owner isolation smoke returned `PEOPLE_CONTEXT_RLS_PASS_ROLLED_BACK`.
- Automated tests: 199 passed, zero failed.
- Live UI: four main tabs; People presets; no duplicate self profile required; synthetic no-chart relationship conversation replied and synced. Synthetic person and its conversation were deleted via the UI afterward.
- QA created an empty personal-context settings record with all four scopes false; no personal chart, journal, growth or chat data was imported or authorized.
- Local responsive checks at 390 and 789 CSS pixels: no horizontal page overflow. Reference-source selection remains explicit, bounded and account-scoped; local records are snapshots updated through consent settings, not automatic continuous imports.
- Diary entry removed from Home, retained under My. User-facing model-brand copy replaced with generic AI-service language. Actual provider privacy-policy destination retained for truthful disclosure.
- Native source synced, but device build blocked: Xcode reports iOS 26.5 platform missing. No new device install or App Store submission claimed for this release.
