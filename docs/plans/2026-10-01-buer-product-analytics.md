# Buer Product Analytics Implementation Plan

> Execution: use executing-plans task-by-task in this task. The user authorized H5, native App and ops implementation, withdrawal of build 5 and resubmission; no additional release-choice approval is required.

**Goal:** Consent-gated, content-free Buer usage measurement for H5 and iOS, with independent verified reporting in ops User Activity and a replacement App Store submission.

**Architecture:** Reuse the existing portfolio GA4 property and linked Firebase project, but register Buer's own bundle and iOS stream. A strict event contract feeds the isolated H5 measurement frame or a native Firebase bridge. Ops providers filter exact hostname/stream and render aggregate observations, never raw personal records or invented conversions.

**Tech Stack:** Vanilla JS, Capacitor/Swift, Firebase Analytics, Node test runner, existing ops GA4 Data API provider.

## Task 1 — Configure and validate reporting identity
- Register only com.yonge6.buerwithin / App Store 6814764726 in the existing linked Firebase project; preserve Yixiu app, property, pricing and billing.
- Download Buer client configuration through the authorized console; verify bundle and app IDs. Identify its separate GA4 stream from official configuration.
- No SDK initialization before consent; no Debug/simulator/TestFlight production collection; ads, IDFA/IDFV and automatic screen collection disabled.

## Task 2 — Shared contract, consent and behavioral hooks
- Create shared/buer-analytics-contract.js and src/services/buer-analytics.js; tests/buer-analytics.test.mjs.
- Test default-off, opt-out queue clearing, exact event/property allowlists, finite bounded numbers, no free text, independent platform routing and active-time accounting.
- Add explicit success/failure hooks in src/app/buer-home.js, src/app/buer-growth.js, src/app/buer-membership.js and app.js. Measure confirmed outcomes, not just button clicks. Preserve H5 basic measurement and legacy chart events separately.
- Modify analytics.js/analytics-frame.js to accept validated Buer events without exposing product DOM to auto form tracking.
- Provide a separate consent control in both platforms, independent of Supabase/cloud saving. Disclose Google Analytics/Firebase and pseudonymous usage IDs; no claim of guaranteed anonymity.

## Task 3 — Native bridge and release privacy
- Add consent-gated Firebase analytics bridge to ios/App/App; link Firebase through Xcode project (not the Capacitor-generated package).
- Validate incoming JS event and parameter names again natively. StoreKit verified production install gate, disable IDFV and ad collection. Never send transaction IDs or purchase proof.
- Update privacy policy, Info.plist, privacy manifest, App Store privacy declarations and review notes to accurately match collection.
- Increment App and widget build number, preserve Doudoulong AppIcon and all screenshots.

## Task 4 — Ops aggregates
- Extend providers/product-analytics-provider.mjs, product-analytics-config.mjs, sync-product-analytics.mjs and public/product-usage.js in the ops repository.
- Add tests for Buer host/stream isolation, event filtering, stale evidence preservation, absent metrics null, bilingual and mobile rendering.
- Show audience, conversation requests/success/errors/latency, reflection/manual/story/action outcomes, sharing and membership stages. Counts are independent observations, not user funnels; retention and unverified Apple financial outcomes remain null.
- Use existing daily synchronization, no duplicate automation. Append audit evidence for mutations and deployment.

## Task 5 — Verification and release
- Run targeted tests then full appropriate suites, source/build privacy scans and browser consent-off/on/withdrawal checks using intercepted test traffic (no synthetic production users).
- Deploy H5 and ops with rollback, verify public assets and dashboard. Read official GA4 provider output; pending reports remain pending.
- Verify build 5 review state, withdraw, archive/upload new build, confirm Apple processing and bundled icon/config, submit App and existing three subscription items, then independently read Waiting for Review.
- Commit only scoped files, preserving unrelated local files; record exact new submission and deployment evidence.

## Execution checkpoint — 2026-10-01 15:03 Asia/Shanghai
- Firebase app registered in the already-linked yixiu-meditation project: Buer Within iOS, bundle com.yonge6.buerwithin, app ID 1:319625849765:ios:d551392a9e3c1bf328564c. Separate GA4 stream 15912522443 verified in property 549913650, account 404662925.
- Shared contract, independent default-off consent, H5 bridge, explicit functional hooks, native FirebaseAnalyticsCore 12.19.2 bridge, privacy copy/manifest and ops provider/UI implemented locally. Integration and browser QA still required. No production deployment or commit yet.
- Buer Node tests 153/153 passed; ops tests 106/106 passed. Google API readback of both Buer H5 and iOS returned waiting_for_events, not zero usage. Local ops state and audit updated by the existing sync.
- Build number incremented to 6, icon unchanged. Initial archive failed because Xcode reports the iOS 26.5 platform runtime absent despite installed SDK. Platform download started then interrupted for this login handoff; no unrelated data removed. Retry the supported Xcode download/install, watching disk space, then archive.
- App Store Connect readback confirmed build 5 / submission c0871699-8153-4d1a-820d-1ff843e5b270 Waiting for Review with all four items. Clicked Cancel submission and confirmed, but Apple redirected to login. Withdrawal outcome is UNKNOWN: read submission state after login before retrying. Replacement has NOT been uploaded or submitted.
- Browser TaskSpace 52 / p3 is the Apple login page, handed to user. Resume that same space only after user confirms login. p2 retains verified GA4 streams; p1 ops dashboard.
- Remaining: browser consent/queue/mobile QA, stronger transport/native regression tests, native archive and privacy declaration update, review notes build 6, scoped commits, H5 artifact deployment to Yonge6/buer-life-manual-preview (not original human-design Pages), ops bounded deployment with rollback, App Store withdrawal reconciliation/upload/resubmission/readback.

## Login-resumed checkpoint — 2026-10-01
- Apple login recovered. Build 5 submission c0871699-8153-4d1a-820d-1ff843e5b270 independently read back 已移除; version 1.0 被开发者拒绝. Withdrawal complete, replacement NOT submitted.
- iOS 26.5 runtime installed successfully. Build 6 reached Swift compilation but archive failed explicitly with No space left on device / build database full. No build 6 xcarchive exists. Log: /tmp/buer-build6.log. Disk available approximately 255 MiB after failure. No user files or older archives removed.
- Buer tests now 156/156 passing. Fixed consent-generation queue isolation, native fail-closed revalidation, story deletion not counted as save, daily image saves not counted as confirmed shares. Review notes build 6 prepared locally.
- Work remains uncommitted and undeployed. Need user authority for bounded regenerable-cache cleanup or user-provided disk space before retrying archive; preserve build 4/5 archives and original assets. Browser TaskSpace 52 handed off at this blocker; resume same space after user response.
