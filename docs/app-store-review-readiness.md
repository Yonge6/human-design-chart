# App Store Review Readiness

This document is a release-readiness record for the iOS app. It is not proof
of App Store approval, legal clearance, or third-party rights.

## Release Candidate

| Item | Value |
| --- | --- |
| App | Pluto Life Manual / Pluto 人生使用说明书 |
| Bundle ID | `com.yonge6.plutolifemanual` |
| Marketing version | `1.1.0` |
| Build number | `1` |
| Minimum iOS version | `15.0` |
| Runtime | Capacitor 8 and WKWebView |
| Calculation | On-device Swiss Ephemeris WASM and SE1 data |

## Guideline 4.2: Native Product Value

The app is not intended to be a passive website wrapper. Its current native
and on-device value includes:

- Human Design calculation and poster rendering on the device with bundled
  Swiss Ephemeris WASM and SE1 data.
- Local chart history stored in the app container, including offline reopening
  of previously generated results.
- Add-only Photos integration for saving a generated poster.
- Native iOS share sheet for images and links, including completed and
  cancelled states.
- Device-level privacy settings and local history deletion.
- A branded app icon, launch screen, bilingual interface, and mobile-specific
  layout.

The core chart flow works without a remote calculation API. Place search is
the principal network-dependent input helper.

## Review Positioning

- Pluto is for self-exploration, personal reflection, and entertainment.
- It does not provide medical, psychological, legal, financial, or other
  professional diagnosis or advice.
- The app is independently developed and is not affiliated with or endorsed by
  Human Design official organizations or My Human Design.
- Results should not be presented as scientific findings or as a substitute
  for qualified professional guidance.

## Reviewer Test Steps

1. Launch the app and choose Chinese or English.
2. Enter a name, date, local birth time, AM/PM, and a complete birth place.
3. Select a Photon place suggestion when network access is available. If place
   search is unavailable, enter a complete place manually and continue with the
   app's supported fallback behavior.
4. Generate the Life Manual and inspect the BodyGraph, core properties, concise
   reading, and poster.
5. Open Privacy Settings to verify privacy mode and local-history controls.
6. Choose Save Image. The app requests add-only Photos permission at that
   moment; deny and allow paths should both leave the app usable.
7. Choose Share to open the native iOS share sheet, then complete or cancel.
8. Enable local history, generate a result, reopen it, and test the keep/delete
   choices when turning history off.
9. Disconnect the network and reopen a saved local result. The stored result
   remains available; a new place search may be unavailable.

Use synthetic birth data during review. Do not send real birth data to support.

## Network Use

| Destination | Purpose | Data sent |
| --- | --- | --- |
| `photon.komoot.io` | Primary place search | User-entered place search text and request metadata |
| `geocode.arcgis.com` | Place-search fallback | User-entered place search text and request metadata |
| `human-design.wonderelian.com` | Public support, privacy, and source links | Normal HTTPS request metadata |

Names, birth dates, birth times, and generated charts are not included in
Photon or ArcGIS place-search requests. The providers may process request
metadata under their own policies.

Cloud Save and anonymous product analytics are present as optional product
controls but their production backend is not deployed for this release
candidate. They must not be described to reviewers or in App Privacy answers
as active data-collection services. Local history never uploads data.

## Permissions

| Permission or system service | When used | Required behavior |
| --- | --- | --- |
| Photos add-only access | User chooses Save Image | Denial shows an error and does not block chart use |
| iOS share sheet | User chooses Share | Cancellation is treated as a normal outcome |
| Network access | Place search and public links | Saved local results remain available offline |

The app does not request Contacts, Camera, Microphone, precise device location,
HealthKit, Bluetooth, or tracking permission.

## Privacy Manifest Audit

- The app target contains `PrivacyInfo.xcprivacy` in Copy Bundle Resources.
- The manifest declares no tracking and no tracking domains.
- It declares coarse location for app functionality to reflect user-entered
  place search sent to Photon or ArcGIS.
- Required-reason API declarations must be rechecked against the final archive
  and every embedded third-party SDK before upload.
- App Store Privacy answers should conservatively disclose coarse location as
  not linked to identity, not used for tracking, and used for app
  functionality, pending final provider-policy and legal review.
- Names, birth details, generated charts, and local history remain on device in
  the current release candidate and should not be marked as developer-collected
  data.

## Phase 6A Archive Audit

Audit date: `2026-07-26`

- Xcode `26.6` (`17F113`) with iOS SDK `26.5` (`23F81a`) was used.
- A signed Release archive for `generic/platform=iOS` completed successfully.
- Code signing was not disabled. The archive used the installed Apple
  Development identity and the automatic team provisioning profile.
- The archived app is arm64, version `1.1.0`, build `1`, Bundle ID
  `com.yonge6.plutolifemanual`, and minimum iOS `15.0`.
- `codesign --verify --deep --strict` passed for the archived app.
- The app, Capacitor framework, and Cordova framework each contain a
  `PrivacyInfo.xcprivacy` file.
- Capacitor and Cordova XCFramework signature records are present and identify
  Apple Developer Program signatures.
- Xcode's archive build scanned the two embedded frameworks for privacy
  manifests.
- A standalone Xcode Privacy Report was not exported from the command line.
  Generate and visually review the final report in Organizer from the
  distribution-signed archive before upload.
- Local App Store Connect export failed with `No profiles for
  'com.yonge6.plutolifemanual' were found`. The machine currently has an Apple
  Development identity, not the App Store distribution profile needed for
  export.
- No binary was uploaded to TestFlight or App Store Connect.

The resulting development-signed `.xcarchive` is suitable for local Organizer
inspection, but it is not an App Store distribution artifact and has not passed
Apple's online validation.

## Release Blockers

The following issues remain blockers before TestFlight or App Review:

1. **Swiss Ephemeris licensing choice.** Confirm with qualified counsel and, if
   necessary, Astrodienst whether this App Store distribution will use the
   AGPL option or requires a Professional License. No license purchase or final
   legal conclusion is represented by this repository.
2. **BodyGraph visual rights.** Replace the transitional visual template with
   an original design supported by source files and an authorship record, or
   obtain and retain sufficient authorization evidence. The existing risk is
   documented in
   [bodygraph-original-redesign-plan.md](bodygraph-original-redesign-plan.md).

Additional release gates:

- Produce a signed Release archive with the distribution identity and
  provisioning profile intended for App Store distribution.
- Inspect the final archive's privacy manifests and SDK signatures in Xcode.
- Complete real-device testing across the supported iOS range.
- Confirm final App Store Privacy, age-rating, content-rights, and export
  compliance answers in App Store Connect.

## Archive Acceptance

An archive is ready for Organizer review only when all of the following are
true:

- It uses `generic/platform=iOS` and the Release configuration.
- Code signing is enabled; an unsigned simulator build is not evidence.
- The archived app reports version `1.1.0`, build `1`, Bundle ID
  `com.yonge6.plutolifemanual`, and minimum iOS `15.0`.
- `PrivacyInfo.xcprivacy` is present in the archived `.app`.
- Embedded frameworks are signed and their privacy manifests are present where
  required.
- No TestFlight upload or App Review submission occurs without separate
  authorization.
