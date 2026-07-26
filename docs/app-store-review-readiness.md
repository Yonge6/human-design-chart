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

Cloud Save, anonymous product analytics, and Delete Cloud Data depend on a
production backend that is not deployed for this release candidate.
**Unavailable remote features are removed from the release candidate UI.**
They must not appear as available features in App Store descriptions,
screenshots, or Review Notes. Local history never uploads data. Phase 6B
implements this as a runtime capability gate: a Capacitor native build without
complete Supabase configuration hides and disables all three controls, masks
effective remote consent, and blocks remote operations without deleting saved
preferences. Unit and browser tests cover the unavailable and future-configured
states.

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
- Manually entered birth-place search text is not the user's or device's
  current location, so the manifest does not declare Apple's Coarse Location
  data type for that input.
- Required-reason API declarations must be rechecked against the final archive
  and every embedded third-party SDK before upload.
- Photon and ArcGIS retention behavior and the final App Privacy classification
  remain an unresolved privacy gate. Obtain and retain evidence for how each
  provider handles the query before completing App Store Connect answers.
- If a provider uses the query only to service the request in real time and
  does not retain it, the query is not Apple "collected data." If a provider
  retains the search text, assess Search History or Other User Content based
  on Apple's current definitions and the documented provider behavior.
- Do not select a final App Privacy category without that evidence.
- Names, birth details, generated charts, and local history remain on device in
  the current release candidate and should not be marked as developer-collected
  data.

## npm Audit Remediation

Audit commands: `npm audit --json`, `npm explain`, and `npm ls --all` on
`2026-07-26`. Before remediation, the three findings were development-only
dependencies. The Web build and Capacitor sync copy selected source/static
files rather than `node_modules`; inspection of `dist` and the signed iOS
archive confirmed that none of the affected packages was embedded in either
release artifact.

The remediation upgraded the direct development dependency `ajv` from
`8.18.0` to `8.20.0` and refreshed only the affected transitive packages
allowed by existing semver ranges. `@capacitor/cli`, `@capacitor/core`, and
`@capacitor/ios` remain on the compatible `8.4.2` release line. No override,
forced audit fix, or Capacitor architecture migration was used.

| Advisory ID | Severity | Before | After | Final dependency path | In Web `dist` | In iOS Archive | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | High | `brace-expansion@5.0.7` | `brace-expansion@5.0.8` | root dev dependency `@capacitor/cli@8.4.2` → `rimraf@6.1.3` → `glob@13.0.6` → `minimatch@10.2.5` → `brace-expansion@5.0.8` | No | No | Fixed; full Web and iOS regression suite passed. |
| [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) | High | `ajv@8.18.0` → `fast-uri@3.1.3` | `ajv@8.20.0` → `fast-uri@3.1.4` | root dev dependency `ajv@8.20.0` → `fast-uri@3.1.4` | No | No | Fixed; Schema, API, and security suites passed without contract changes. |
| [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) | Moderate | `tar@7.5.20` | `tar@7.5.22` | root dev dependency `@capacitor/cli@8.4.2` → `tar@7.5.22` | No | No | Fixed; Capacitor sync, simulator build, and signed Release Archive passed. |

After remediation, `npm audit` reports `0 vulnerabilities`; `npm ls --all`
reports no invalid, extraneous, or unmet required peer dependency.

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
- The rebuilt app manifest declares `NSPrivacyTracking = false`, contains an
  empty collected-data array, and does not declare Coarse Location.
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
- Reconfirm in the final distribution-signed archive that Cloud Save, anonymous
  analytics, and Delete Cloud Data remain hidden and disabled while production
  Supabase configuration is absent.
- Resolve the Photon/ArcGIS retention evidence and final App Privacy
  classification.
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
