# iOS App Store Release Checklist

Use this checklist for the `1.1.0 (1)` iOS release candidate. Archive
preparation does not authorize TestFlight upload or App Review submission.

## Legal and Rights Gates

- [ ] Swiss Ephemeris AGPL / Professional License distribution choice reviewed
  by qualified counsel or confirmed with the relevant rights holder.
- [ ] BodyGraph visual template replaced with documented original work or
  supported by retained authorization evidence.
- [ ] Human Design names and terminology reviewed for the intended storefronts.
- [ ] Content-rights answers match the evidence retained by the developer.

## Build and Archive

- [ ] `npm ci` completes from the committed lockfile.
- [ ] `npm audit` reports zero known vulnerabilities.
- [ ] `npm run build` succeeds.
- [ ] `npx cap sync ios` succeeds.
- [ ] Xcode and the selected iOS SDK versions are recorded.
- [ ] Release archive uses `generic/platform=iOS`, not a simulator.
- [ ] Code signing remains enabled during the archive.
- [ ] Version is `1.1.0`; build number is `1`.
- [ ] Bundle ID is `com.yonge6.plutolifemanual`.
- [ ] Deployment target is iOS `15.0`.
- [ ] Archive opens in Xcode Organizer without structural errors.
- [ ] Final distribution validation succeeds before upload.

## Privacy and SDK Audit

- [ ] `PrivacyInfo.xcprivacy` is present inside the archived app.
- [ ] Xcode Privacy Report is generated and reviewed from the final archive.
- [ ] Capacitor and every embedded SDK provide the expected privacy manifests
  and signatures.
- [ ] Required-reason APIs match actual app and SDK behavior.
- [ ] Photon and ArcGIS place-search disclosure matches actual requests.
- [ ] Local history is described as on-device data, never cloud collection.
- [ ] Cloud Save and analytics are not described as active while their
  production services remain undeployed.
- [ ] App Store Privacy answers match the final binary and provider policies.

## Installation and Upgrade

- [ ] Fresh installation starts with privacy mode off, local history on, Cloud
  Save off, and product analytics off.
- [ ] Upgrade from the previous public build retains explicit user settings and
  existing local history.
- [ ] Uninstalling removes data held in the app container.
- [ ] Reinstallation does not unexpectedly restore deleted local records.

## Core Release Testing

- [ ] Chinese and English flows complete without missing or mixed copy.
- [ ] Real Swiss Ephemeris WASM and SE1 files load and calculate successfully.
- [ ] BodyGraph, core properties, reading, poster, and QR code render correctly.
- [ ] Privacy mode regenerates a poster without personal details.
- [ ] Local history creates, reopens, retains, and deletes records correctly.
- [ ] No cloud chart or analytics request occurs without separate consent.
- [ ] App disclaimer remains visible and accurate.

## Native Features

- [ ] Save Image succeeds after Photos add-only permission is granted.
- [ ] Save Image handles denied Photos permission without a crash.
- [ ] Save Image handles previously denied or restricted access.
- [ ] System share completes successfully.
- [ ] System share cancellation returns to the app normally.
- [ ] Temporary shared image files are removed after completion or cancellation.

## Network and Offline

- [ ] Photon place search succeeds on a normal connection.
- [ ] ArcGIS fallback is exercised when Photon fails.
- [ ] Manual complete-place fallback is understandable when both providers fail.
- [ ] Weak-network delays and cancellation do not freeze the form.
- [ ] Previously saved local results open with no network.
- [ ] The app does not claim that new place search is available offline.
- [ ] No API, Supabase, or Edge Function dependency blocks local generation.

## Devices and OS Versions

- [ ] iOS 15 minimum-version device or test environment.
- [ ] At least one intermediate supported iOS version.
- [ ] Current iOS 26 device or test environment.
- [ ] Small iPhone viewport (for example iPhone SE).
- [ ] Standard and large iPhone viewports.
- [ ] Portrait layout has no clipped controls or horizontal overflow.
- [ ] Settings, detailed reading, and history surfaces remain scrollable.

## Diagnostics

- [ ] No reproducible crash during generation, history, save, or share.
- [ ] Device console contains no unhandled application error.
- [ ] Failed network requests are expected, disclosed, and recoverable.
- [ ] WASM and SE1 asset loading has no 404 or integrity failure.
- [ ] Memory and storage behavior are reasonable across repeated generations.
- [ ] Crash logs and exact reproduction steps are retained for every blocker.

## Store Submission Materials

- [ ] Localized name, subtitle, description, keywords, and promotional text are
  checked against current App Store limits.
- [ ] Support and privacy-policy URLs are live over HTTPS.
- [ ] Screenshot set matches the final binary and contains no real user data.
- [ ] App Review Notes include synthetic test data and clear feature steps.
- [ ] Age rating, content rights, and export compliance are rechecked in the
  current App Store Connect questionnaire.
- [ ] App icon and screenshots pass automated and visual asset validation.
- [ ] Release owner separately authorizes TestFlight upload.
