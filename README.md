# Human Design BodyGraph

Browser-side Human Design chart generator with a Swiss Ephemeris WASM calculation engine and a dynamic SVG BodyGraph.

## Local preview

```bash
python3 server.py
```

Open `http://127.0.0.1:8789/`.

Run the engine regression suite with `npm test`.

## iOS App

The current website can be packaged as a local iOS app with Capacitor.

```bash
npm install
npm run ios:sync
npx cap open ios
```

Run `npm run ios:build` for a repeatable unsigned simulator build.

The iOS shell adds native Save to Photos and system sharing, plus on-device
chart history, offline reopening, privacy defaults, and local data deletion.
These features keep working with the shared web calculation and rendering core.

Use the `App` scheme in Xcode. The first setup uses:

- App name: `Pluto 人生使用说明书`
- Bundle ID: `com.yonge6.plutolifemanual`
- Swift Package Manager

After every web update, run `npm run ios:sync` before building the iOS app.
See [docs/ios-app-roadmap.md](docs/ios-app-roadmap.md) for the multi-app plan.

The birth data stays in the browser during chart calculation. Birth locations support global type-ahead search with a second geocoder fallback. Suggestions are optional: submitting a typed address resolves it automatically, and mainland Chinese addresses can use the nationwide civil timezone even when search suggestions are unavailable. Coordinates map to an IANA timezone locally; the timezone is used internally for accurate UTC conversion and is not shown as a separate form field.

## Calculation

See [ALGORITHM.md](ALGORITHM.md) for the complete calculation chain and verification evidence.

## Licensing

The browser astronomy engine is based on Swiss Ephemeris and is distributed under AGPL-3.0 in this prototype. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before commercial deployment.
