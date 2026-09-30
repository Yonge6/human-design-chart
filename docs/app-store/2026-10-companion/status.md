# Companion redesign and resubmission

Latest status: build 4 was subsequently withdrawn to correct the native App icon. Build 5 with Doudoulong is now Waiting for Review, verified 2026-10-01 07:07 Asia/Shanghai. See [icon-build5.md](icon-build5.md) for the current submission and evidence. The build 4 record below is historical.

## Withdrawal verified — 2026-10-01

At the user's explicit request, removed the current pending Buer Within submission from review in App Store Connect.

- App: 6814764726, Buer Within: AI Growth Coach.
- Version/build: 1.0 (3).
- Submission: 44d6797f-bdbe-4d0a-a1e3-2b09db92316a.
- Independently read the submission detail page after processing: Removed / 已移除 for the submission and all four items.
- No live release was deleted. No pricing changes were made.

## Resubmission verified — 2026-10-01 01:41 Asia/Shanghai

Following the user's approval, completed the ivory/sage artwork and native companion release, then submitted all four items together.

- App: 6814764726, Buer Within: AI Companion / 不二见己：AI成长伙伴豆豆龙.
- Version/build: 1.0 (4); build ID: 717e0bdd-359b-43df-8519-616a01f64d7a.
- Submission ID: 1fb3b367-1abd-4440-be88-2bfa8feecd7f.
- Submission URL: https://appstoreconnect.apple.com/apps/6814764726/distribution/reviewsubmissions/details/1fb3b367-1abd-4440-be88-2bfa8feecd7f
- Independently read the submission detail after submission: **Waiting for Review / 等待审核** for the submission and all four items: iOS App 1.0 (4), Buer Within Plus subscription group, Annual and Monthly subscriptions.
- No subscription pricing changes were made. Waiting for review is not approval or public availability.

### Artwork and metadata

- Replaced all 16 store posters: English and Simplified Chinese, four iPhone and four iPad screenshots per language.
- All remote assets processed COMPLETE; order and source checksums matched local outputs. See asset-verification.json and upload-records.json.
- Poster dimensions: iPhone 1284 × 2778; iPad 2064 × 2752. Sources and reproducible HTML retained under screenshots/ and posters/.
- Interface captures use the actual native web bundle in device-emulated browser viewports, cropped without fabricated native chrome. Example journal/action content is synthetic and was not sent to the production AI service.
- Updated both store names, descriptions, keywords, promotional copy and review notes to companion positioning; removed public coach positioning from those metadata fields. Prior release folders remain intact.

### Build verification

- Native archive, App Store export and upload succeeded; Apple processed build 4 as VALID / APP_STORE_ELIGIBLE.
- Automated distribution checks passed (bundle, signing, profiles, privacy manifests, native feature gate and required resources).
- Targeted tests: 29 passed, 0 failed.
- Native build and widget build numbers are both 4. Native bundle fingerprint: 47f0833c391cd39d.
- Physical-device/simulator interaction testing, Organizer Privacy Report and Organizer Validate App were not performed. Browser-emulated captures do not substitute for physical-device validation.
