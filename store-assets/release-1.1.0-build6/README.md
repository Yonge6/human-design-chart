# Pluto 1.1.0 (6) App Store release

Native binary source commit: `0fa102ede230d865743eb846469a2cc289a222b1`.

- Withdrawn previously waiting version 1.1.0 (4); selected final build 6 after processing.
- Build 5 was superseded by build 6 after a native dialog safe-area fix.
- Distribution archive/export/upload succeeded; both app and widget are signed with App Group entitlements.
- 113 Node tests and 24 browser E2E tests passed after the final code change.
- Native simulator QA: iPhone 17 Pro Max, iPad 11-inch and 13-inch. Text results, detailed reading, daily tips and share preview inspected. iPhone native system share sheet verified.
- Sixteen prepared actual native simulator screenshots: four per device class and locale. iPhone 1320 × 2868; iPad 2064 × 2752. JPEG conversion preserves full resolution. The earlier 11-inch landscape image is QA-only and is not uploaded.
- English and Simplified Chinese store descriptions, keywords, promotional text and review notes updated.
- Existing automatic release after approval is preserved.
- SpringBoard widget placement and physical-device timeline refresh remain outside completed manual QA. Actual shared-container writing, deep linking, native widget compilation and distribution entitlement checks passed.

`metadata.json` contains submitted copy; `screenshots.json` records the 16 prepared upload materials and their hashes. The four primary images in each locale show the daily-tip home, results, detailed reading and QR share preview. Screenshot data is fictional.

Archive, IPA, signing/export/upload logs, test logs and old screenshot backups are retained locally under `build/appstore-2026-09-08/` (not committed). ## Pending Apple authentication and final review submission

At 2026-09-08 00:59 Asia/Shanghai, the fresh App Store Connect page redirected to Apple login. The user was asked to restore the Chrome session. No new App Review submission has been confirmed.

Before the session expired, Build 6 was selected and saved. Screenshot upload counts alone were insufficient: Apple reported screenshots still uploading, and language readback exposed an English iPad set on the Chinese view. A sequential Chinese iPad replacement was started, but its persistence must be verified after login. Check all four device/locale sets against the local assets, confirm real Apple-hosted thumbnails and the intended language/order, then add and submit for review. Preserve automatic release after approval.

Final IPA SHA-256: `bc63f9a8d1ca9e93a6134e85337e9b8f183d65555ece9c0c48a4df81e3df6d07`.

Source/material PR: https://github.com/Yonge6/human-design-chart/pull/40. The first engine-web CI attempt reported aborted image requests in the production-bundle E2E (23/24 passed); the same final source passed all 24 locally. A single CI job rerun was requested, with the result pending at this checkpoint.
