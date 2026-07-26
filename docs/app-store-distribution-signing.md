# App Store Distribution Signing

This document records a read-only signing audit for Pluto Life Manual. It is
not an authorization to create Apple signing assets, validate online, upload a
build, or submit the app.

## Current Status

Audit date: `2026-07-26`

| Item | Result |
| --- | --- |
| Team | `L855ZVM679` |
| Bundle ID | `com.yonge6.plutolifemanual` |
| Version / build | `1.1.0 (1)` |
| Signing style | Automatic |
| Apple Development identity | Available; valid through July 2027 |
| Apple Distribution identity with private key | **Missing** |
| Matching App Store profile | **Missing** |
| Distribution readiness | **BLOCKED** |

The keychain contains one valid Apple Development identity for the configured
team. It does not contain an Apple Distribution identity with its private key.
The installed profiles include an unrelated App Store profile and a wildcard
development profile, but no unexpired App Store Connect distribution profile
for `com.yonge6.plutolifemanual`.

Certificate fingerprints, serial numbers, profile UUIDs, device identifiers,
private keys, and profile payloads are intentionally omitted.

## Project Configuration

Debug and Release currently use:

- `DEVELOPMENT_TEAM = L855ZVM679`
- `CODE_SIGN_STYLE = Automatic`
- `PRODUCT_BUNDLE_IDENTIFIER = com.yonge6.plutolifemanual`
- `MARKETING_VERSION = 1.1.0`
- `CURRENT_PROJECT_VERSION = 1`
- `IPHONEOS_DEPLOYMENT_TARGET = 15.0`

The target does not currently enable App Groups, Associated Domains, Push
Notifications, Keychain Sharing, iCloud, or Sign in with Apple. No entitlement
file is assigned. Do not add capabilities unless a shipped feature requires
them.

`ITSAppUsesNonExemptEncryption` is `false`. The app icon catalog and launch
storyboard are assigned, the universal App Store icon source is 1024 by 1024,
and `PrivacyInfo.xcprivacy` is a target resource.

## Read-only Diagnostic

Run:

```bash
npm run ios:distribution:readiness
```

To inspect a local archive as well:

```bash
npm run ios:distribution:readiness -- --archive build/release/PlutoLifeManual-1.xcarchive
```

The script reads Xcode build settings, code-signing identities, installed
profiles, and archive contents. It never modifies the keychain, calls a portal
write API, creates a profile, exports an IPA, validates online, or uploads.

Results use three levels:

- `PASS`: the inspected item is present and matches the expected release.
- `BLOCKED`: a required local signing asset or archive property is missing.
- `MANUAL`: an Organizer or human review step remains.

The current expected result is `BLOCKED` until both the Apple Distribution
identity and exact App Store profile are naturally installed.

## Relationship to Swiss Ephemeris Licensing

The Swiss Ephemeris AGPL licensing path is selected and documented. The project
does not claim or rely on a Swiss Ephemeris Professional License. Before App
Store distribution, the release must verify fulfillment of the applicable AGPL
source-code, license, notice, and distribution obligations, and separately
assess App Store distribution compatibility under that path.

Signing readiness does not establish AGPL compliance or App Store compatibility.
No separate Astrodienst authorization, legal opinion, Apple compatibility
confirmation, or complete closure of distribution risk is represented.

## Relationship to BodyGraph Provenance

Signing readiness does not establish that visual-rights review is complete.
The current BodyGraph audit classification is `DERIVED_OR_UNCLEAR`; it records
an unresolved evidence status, not a finding of infringement or a fixed
requirement to redesign.

No usable source-authorship evidence or applicable authorization is currently
available. The planned App Store release path is a style-preserving, clean-room,
independently generated replacement. Supplemental evidence or authorization
could change that plan, but none is currently claimed. Phase 6E has not started,
this PR does not modify the current SVG, and the current SVG is not planned for
the final App Store Release Candidate. Conversely, resolving BodyGraph
provenance would not provide the missing Apple Distribution identity or matching
App Store profile. See
[bodygraph-provenance-audit.md](bodygraph-provenance-audit.md).

## ExportOptions Example

[`ios/ExportOptions-AppStoreConnect.plist.example`](../ios/ExportOptions-AppStoreConnect.plist.example)
uses values supported by Xcode 26.6:

- `method = app-store-connect`
- `destination = export`
- `signingStyle = automatic`, matching the project
- `manageAppVersionAndBuildNumber = false`
- the existing public team ID

The example contains no Apple ID, password, certificate, private key, or
profile. It does not prove that a matching profile exists. Do not add
`-allowProvisioningUpdates` to the archive or export commands for this audit.
A local export should be attempted only after the required assets have been
installed and separately authorized.

## Account Holder or Admin Steps

These are manual Apple account actions and were not performed in Phase 6D-A:

1. Confirm that `com.yonge6.plutolifemanual` exists as the intended explicit
   App ID under team `L855ZVM679`.
2. Confirm or create an Apple Distribution certificate under the correct
   account. Install the certificate and its private key in the signing
   keychain. A certificate without its private key is not usable.
3. Create an App Store Connect distribution profile for the exact App ID,
   distribution certificate, and team.
4. Download and install the profile locally. Do not add the profile to Git.
5. Re-run the read-only diagnostic and create a fresh Release archive for
   `generic/platform=iOS`.
6. Open that archive in Xcode Organizer, inspect signing and entitlements, and
   generate the Privacy Report.
7. Only after all legal, visual-rights, privacy, and real-device gates close,
   obtain separate authorization to run Validate App and upload.

## Distribution Archive Acceptance

A distribution archive is acceptable for the next manual gate only when:

- Release uses `generic/platform=iOS` with signing enabled.
- Apple Distribution signing and the exact App Store profile are used.
- Bundle ID, version, build, and minimum iOS remain
  `com.yonge6.plutolifemanual`, `1.1.0`, `1`, and `15.0`.
- `codesign --verify --deep --strict` succeeds.
- App, Capacitor, and Cordova privacy manifests are present.
- WASM, SE1, and the tested Phase 6B native remote-feature gate are present.
- `node_modules` and local signing artifacts are absent.
- Organizer shows no entitlement or profile mismatch.

Local export success is not Apple online validation and must not be reported as
such.

## Organizer Privacy Report

1. Open the final distribution-signed archive in Organizer.
2. Inspect the archive's privacy manifests and SDK signatures.
3. Generate or export the Privacy Report using the Xcode 26.6 Organizer UI.
4. Compare it with the actual app behavior and App Store Privacy answers.
5. Retain the report with the release evidence, not in a public repository if
   it contains local account or signing metadata.

## Common Signing Errors

| Error | Check |
| --- | --- |
| No profiles found | Exact Bundle ID, team, profile type, installation, and expiry |
| Missing private key | The distribution certificate's private key exists in the active keychain |
| Certificate expired | Certificate and profile dates, then regenerate manually if authorized |
| Bundle ID mismatch | Target, App ID, profile application identifier, and archive Info.plist |
| Entitlement mismatch | Target capabilities and profile entitlements match exactly |
| Build number already used | Increment only through an approved release change |

## Secret Handling

Never commit `.p12`, `.cer`, `.pem`, `.mobileprovision`,
`.provisionprofile`, `.ipa`, `.xcarchive`, `AuthKey_*.p8`, local
ExportOptions files, signing passwords, or private keys. The repository
ignores these classes and tests tracked files for common signing-secret
markers. Store signing assets only in approved Apple and secret-management
systems.
