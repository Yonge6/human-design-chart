# iOS App Roadmap

## Current Product

The first iOS app packages the current Pluto Life Manual experience as local
app assets. The website and iOS app continue to use the same Human Design
calculation engine, chart renderer, bilingual copy, and export logic.

- App name: `Pluto 人生使用说明书`
- Bundle ID: `com.yonge6.plutolifemanual`
- Runtime: Capacitor 8 with WKWebView
- Minimum supported iOS version: iOS 15
- Native dependency manager: Swift Package Manager
- Native services: Save to Photos and iOS share sheet
- On-device features: chart history, offline reopening, privacy defaults, and data deletion
- App icon: custom Pluto artwork generated for this product

## Update Workflow

Web and calculation changes remain in the repository root.

1. Update and test the website.
2. Run `npm test`.
3. Run `npm run ios:sync`.
4. Build and test the `App` scheme in Xcode.
5. Increment the iOS version and build number before TestFlight upload.

The `dist` directory is generated and should not be edited manually.

## Product Architecture

Keep one shared core and create separate app shells only when each product has
a clearly different audience and lasting feature set.

### Shared Core

The following capabilities should remain shared:

- Swiss Ephemeris calculation and historical timezone handling
- Human Design graph data and rendering
- Location resolution
- Bilingual terminology
- Image export
- Interpretation rules and content model
- Regression tests

When the repository grows, move these modules into:

```text
packages/
  human-design-core/
  chart-renderer/
  interpretation-engine/
  shared-design-system/
apps/
  web/
  ios-life-manual/
  ios-pluto/
```

Do not make this migration until a second app is ready to begin. The current
structure is smaller and easier to change.

## Planned Apps

### App A: Life Manual Test

Focused product for Human Design chart generation and interpretation.

- Birth data input
- Human Design chart
- Concise and detailed readings
- Native image save and share
- Local chart history
- Privacy controls
- Offline access to previously generated charts

### App B: Pluto Life Guidance

Broader product that keeps the existing chart and adds ongoing experiences.

- Everything in App A
- Daily or weekly personalized guidance
- Journal and reflection prompts
- Relationship comparison
- Transit or cycle views
- Saved insights and favorites
- Optional notifications and widgets

### Possible App C

Create a third app only for a meaningfully different use case, such as
professional readers, relationship analysis, or team use. It should not be a
near-identical reskin of App A or App B.

## App Store Readiness

The iOS project now includes native value beyond a web wrapper:

- Native chart history stored on device (complete)
- Native share sheet and Save to Photos (complete)
- Offline access to previously generated charts (complete)
- On-device privacy defaults and local data deletion (complete)
- Custom App icon and branded launch screen (complete)

Before TestFlight and App Store submission, complete the remaining release work:

- Privacy policy and support links
- Accessibility and real-device QA
- Signed archive and App Store Connect metadata

This also gives each future app a clear reason to exist and reduces the risk
of submitting multiple substantially similar apps.

## Release Sequence

### Phase 1: Engineering Shell

- Package current web assets
- Generate and build the Xcode project
- Verify the full chart flow in an iPhone simulator
- Keep the app unsigned for local simulator development

### Phase 2: Native Product Quality

- Add native share and photo saving (complete)
- Add local chart history and offline reopening (complete)
- Add local privacy settings and data deletion (complete)
- Add custom app icon and branded launch screen (complete)
- Add privacy and support pages
- Test on a physical iPhone

### Phase 3: TestFlight

- Configure the Apple Developer team and signing
- Create the App Store Connect record
- Upload a signed archive
- Run internal TestFlight testing

### Phase 4: Product Split

- Extract the shared core only when development of App B starts
- Give every app a separate Bundle ID, product name, visual identity, and
  differentiated feature roadmap
- Maintain one calculation test suite for all products
