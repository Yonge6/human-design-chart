# Buer Within editorial release — 2026-09-26

The prior submission `3af1ab97-37cd-4a34-8340-8463d88f5ed0` was cancelled at the user's request. App Store Connect independently showed **Removed / 已移除**.

After replacing the build, screenshots and bilingual metadata, the new submission was sent at **2026-09-26 22:18 Asia/Shanghai**:

- App: Buer Within: AI Growth Coach (`6814764726`, `com.yonge6.buerwithin`).
- Version/build: **1.0 (3)**, build resource `10f2cd10-23a7-4b0b-9b0e-1fd207b0f1fa`.
- Submission: `44d6797f-bdbe-4d0a-a1e3-2b09db92316a`.
- Independently read back **Waiting for Review / 等待审核** for all four items: app, subscription group, annual and monthly subscriptions.
- This is submission intake, not Apple approval. Historical Guideline 4.3 concerns remain subject to review; review notes explain the substantive growth-coaching features and optional Human Design reading transparently.

[App Store Connect submission](https://appstoreconnect.apple.com/apps/6814764726/distribution/reviewsubmissions/details/44d6797f-bdbe-4d0a-a1e3-2b09db92316a)

## Materials and verification

- `en-US.json` and `zh-Hans.json`: new descriptions, promotional text and subtitles. Remote descriptions, promotional text, keywords and subtitles read back against local files.
- `posters/`: four posters per language and device (16 total); iPhone 1284 × 2778, iPad 2064 × 2752. All remote assets COMPLETE, ordered 01–04, with matching source MD5 checksums. Chinese iPad has its own Chinese set, not inherited English screenshots.
- `asset-verification.json`: sanitized remote verification evidence.
- `posters/index.html`: reproducible poster layout. Serve the repository root and open with `?lang=en-US&device=iphone&index=0` (or zh-Hans / ipad / indices 0–3). Wait for `window.posterReady` before capture.
- `screenshots/`: actual native web-bundle UI rendered in browser device emulation (430 × 932 at DPR 3; 1032 × 1376 at DPR 2), with synthetic example inputs. These are not physical-device or simulator screenshots; native system navigation is omitted from the presentation crop. No generated AI reply is depicted.
- Native build includes the unified editorial website theme, light native tab appearance, ivory window background and dark status-bar text.
- Archive build, App Store export and upload succeeded. Signature, bundle/version/build, provisioning, privacy-manifest presence and bundled calculation assets passed distribution-readiness checks. The readiness helper still lists Organizer privacy report / Validate App as manual steps; those UI steps were not performed. Apple's upload processing completed and accepted build 3 for review.
- Pricing and storefront availability were not changed in this revision. The unrelated Pluto app was not modified.
