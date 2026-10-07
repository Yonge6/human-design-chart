# Person form simplification

- Source `9eef108741d6273728f06e0fe8a452a7adeead37`; static release `fabdee6f9d639bb578e19f5d04eff708e05ad9ab`.
- Pages run `37610293397` succeeded; public runtime config read back this source revision.
- Production migration `202610070001_people_entered_source.sql` succeeded. Adds neutral manual-entry source without changing existing people or permissions.
- All seven requested editor removals implemented. Date/time/place required; unresolved foreign locations require candidate selection. Existing DST ambiguity handling retained.
- Tests: 199/199 passed, including neutral-source SQL persistence/deletion and missing-birth validation.
- Browser QA with mock account transport (no real personal data written): empty submission blocked; Shanghai resolved to Asia/Shanghai; actual overseas geocoding candidate New York resolved to America/New_York; both generated chart snapshots and valid save payloads.
- Desktop 1176 and mobile 390 CSS-pixel screenshots reviewed. Existing responsive styling retained, no horizontal overflow.
- Production module readback confirms removals and automatic timezone logic. Browser was not signed into a Buer account this turn; no claim of real-account end-to-end saving.
- H5 updated only; no native installation or App Store submission in this change.
