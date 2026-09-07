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

Archive, IPA, signing/export/upload logs, test logs and old screenshot backups are retained locally under `build/appstore-2026-09-08/` (not committed). ## Submitted to App Review

Apple readback confirmed **Waiting for Review** for **1.1.0 (6)** on **2026-09-08 at 01:25 Asia/Shanghai**.

- Submission ID: `92b8e7a2-7bd6-44cb-ab51-4bec245c1e04`.
- Review details: https://appstoreconnect.apple.com/apps/6795840459/distribution/reviewsubmissions/details/92b8e7a2-7bd6-44cb-ab51-4bec245c1e04
- Final uploaded materials: **14 screenshots** — four each for English iPhone, Chinese iPhone and English iPad; two for Chinese iPad (home and detailed reading). The other two Chinese iPad files repeatedly stalled in Apple upload, including an RGB PNG retry; their failed placeholders were removed before submission. All sixteen prepared originals remain available locally.
- `submitted-screenshots.json` lists the 14 submitted assets; `screenshots.json` lists all 16 prepared assets.
- Old version/build 4 submission is confirmed Removed. Build 5 was superseded; build 6 alone is in the new review submission.
- Existing automatic release after approval remains selected.
- Native source and materials PR 40 merged after engine-web, API and Supabase CI passed. Main merge commit: `2d04f81c35bd141802ede3a3f241ff20f2b42a5c`.
- Final IPA SHA-256: `bc63f9a8d1ca9e93a6134e85337e9b8f183d65555ece9c0c48a4df81e3df6d07`.

Apple's first final validation returned a transient unexpected error. Reopening the version and retrying created the draft; Submit for Review returned a success dialog, followed by the submission detail row `iOS App 1.1.0 1.1.0 (6) App version Waiting for Review`. The live DOM readback is retained in `build/appstore-2026-09-08/review-submission-readback.txt`.
