# Pluto 1.1.0 (6) App Store release

Native binary source commit: `0fa102ede230d865743eb846469a2cc289a222b1`.

- Withdrawn previously waiting version 1.1.0 (4); selected final build 6 after processing.
- Build 5 was superseded by build 6 after a native dialog safe-area fix.
- Distribution archive/export/upload succeeded; both app and widget are signed with App Group entitlements.
- 113 Node tests and 24 browser E2E tests passed after the final code change.
- Native simulator QA: iPhone 17 Pro Max, iPad 11-inch and 13-inch. Text results, detailed reading, daily tips and share preview inspected. iPhone native system share sheet verified.
- Sixteen actual native simulator screenshots: four per device class and locale. iPhone 1320 × 2868; iPad 2064 × 2752. JPEG conversion preserves full resolution. The earlier 11-inch landscape image is QA-only and is not uploaded.
- English and Simplified Chinese store descriptions, keywords, promotional text and review notes updated.
- Existing automatic release after approval is preserved.
- SpringBoard widget placement and physical-device timeline refresh remain outside completed manual QA. Actual shared-container writing, deep linking, native widget compilation and distribution entitlement checks passed.

`metadata.json` contains submitted copy; `screenshots.json` records the 16 uploaded materials and their hashes. The four primary images in each locale show the daily-tip home, results, detailed reading and QR share preview. Screenshot data is fictional.

Archive, IPA, signing/export/upload logs, test logs and old screenshot backups are retained locally under `build/appstore-2026-09-08/` (not committed). App Review submission status will be recorded after the final server readback.
