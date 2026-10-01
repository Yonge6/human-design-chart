# Buer usage analytics release

## Verified implementation and deployment

- User authorized withdrawing build 5 and resubmitting analytics in the replacement build.
- Source commit: 54192e1c95010bc32417536243dca6edf7ab4a77 (codex/buer-ui-redesign).
- H5 artifact commit: 7102c033a0cae3cdb246385a8b90338395462b69 in Yonge6/buer-life-manual-preview; Pages deployment succeeded. Public module fingerprint eeaba9b20d84d2de read back; public consent control present and unchecked, no horizontal overflow.
- Ops: https://ops.wonderelian.com/#usage deployed with exact-file hash verification and existing NOESIS design preserved; Buer H5/iOS separate. Official reports returned waiting_for_events, not zero usage. Ops deployment evidence lives in its own repository.
- Verification: Buer 156 tests, ops 106 tests, historical H5 BodyGraph/native exclusion check passed. Local browser bridge mock verified default-off, valid events after consent, rejection of free-text parameters, opt-out stopping further events, and no overflow at 390 px. No synthetic events sent to production GA4.
- Apple privacy: Product Interaction / Analytics / linked / no tracking published; Device ID retains App Functionality and adds Analytics, linked/no tracking. Existing other categories preserved.
- Build 5 submission c0871699-8153-4d1a-820d-1ff843e5b270 read back removed; version 1.0 developer rejected before replacement.
- Build 6 archive succeeded: /private/tmp/Buer-Companion-20261001-build6.xcarchive. Bundled CFBundleVersion 6 and Firebase app ID 1:319625849765:ios:d551392a9e3c1bf328564c verified. Privacy manifest valid. Doudoulong icon SHA256 unchanged: beafb390b9e05216d9de01fd8c553c5d2428c3e6c7332ee0a33e6a816d29e7f7.
- Review notes saved and reloaded: 3602 characters, explicitly describing consent, production-only install gate, and unchanged screenshots/pricing.
- No cache deletion performed by this task. Space recovered externally; the missing runtime was restored before successful archive. Source, assets and build 4/5 archives preserved.

## App Store submission

- Upload/export succeeded; Apple processed build 6, ID 4fb03fd1-87d0-4a6f-9742-f9c29d76cb4f. Non-blocking missing dSYM warnings for FirebaseAnalytics and GoogleAppMeasurement were returned; upload was accepted.
- Submitted 2026-10-01 17:31 Asia/Shanghai, submission a9813066-5d02-48dc-ab3c-49516dd29b57.
- Independent review detail readback: Waiting for Review for all four items: iOS App 1.0 (6), Buer Within Plus subscription group, Annual subscription and Monthly subscription.
- Review URL: https://appstoreconnect.apple.com/apps/6814764726/distribution/reviewsubmissions/details/a9813066-5d02-48dc-ab3c-49516dd29b57
- This is submitted, not approved or publicly released. Native production analytics remain unavailable until release and user opt-in.
