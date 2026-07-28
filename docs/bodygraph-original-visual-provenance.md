# Original style-preserving BodyGraph provenance

## Scope

The current release visual is produced by a new deterministic functional topology, original geometry module, and SVG generator. The generated SVG is a rendering asset for calculated chart state; it is not a calculation source.

## Development lineage

- Base main: `2e055f9305e5369754b66b948a8feabd8f7fbcff`
- A1 design specification: `c16eab03ab5e1404de15092181b9a7fc7e7776c7`
- A2 implementation: `40ae09daeb8ffb33161602d747978be789516baa`
- A3 verification and provenance: the commit containing this provenance record

## Files

- Design specification: `docs/style-preserving-bodygraph-design-spec.md`
- Functional topology: `src/visualization/bodygraph-functional-topology.js`
- Original geometry: `src/visualization/bodygraph-original-geometry.js`
- Deterministic generator: `scripts/generate-original-bodygraph.mjs`
- Generated SVG: `assets/bodygraph-original-template.svg`
- Renderer integration: `src/renderer/bodygraph-renderer.js`
- Product integration: `app.js`

## Deterministic generation

Run `npm run generate:bodygraph` from the repository root. The generated asset has SHA-256 `c89584a9e64032c87efa0086bf2bc014cc34921301c938c4bb056476dd494983`, a `360 x 696` viewBox, 9 centers, 64 gates, and 36 channels.

Repeated generation is byte-for-byte identical. The generator and its geometry inputs do not depend on network access, random values, the current time, machine-specific paths, or external visual templates.

## Clean-room process

The A1 and A2 implementation tasks did not read a prior SVG, prior screenshots, historical blobs, historical visual diffs, or a third-party BodyGraph. This isolated A3 verification task also did not read those materials and removed two legacy visual test paths before running tests, without opening their contents.

The implementation and verification use the current brand CSS and page footprint, functional topology, rendering state semantics, the A1 high-level specification, and the newly generated visual itself. This record is development-process and source evidence. It is not an absolute legal guarantee, is not legal advice, and does not claim Apple approval.

## Functional separation

The new SVG does not change astronomical calculation or Human Design chart logic. It does not change the Schema, API contract, or `chartHash`. The renderer receives only post-calculation visual state for Personality, Design, channel activation, and Defined or Undefined centers.

## Verification

The isolated A3 worktree completed these checks before its commit:

- `npm ci` installed from the lockfile and `npm audit` reported zero vulnerabilities.
- `npm run generate:bodygraph` reproduced the committed SVG byte for byte.
- `npm test` passed 92 of 92 tests, including the real Swiss Ephemeris WASM calculation fixture, fixed engine/API/Schema/`chartHash` parity, the complete 9-center/64-gate/36-channel topology, deterministic generation, SVG accessibility and structure, and the renderer state matrix.
- `npm run test:schema` passed 7 of 7 tests.
- `npm run test:api` passed 11 of 11 tests.
- `npm run test:privacy` passed 4 of 4 tests.
- `npm run test:security` passed 3 of 3 tests.
- `npm run build`, `npm run test:pages`, and `npm run build:api` passed; Pages passed 5 of 5 tests.
- The configured E2E command was first attempted on port 8789, where an unrelated local system bridge already held the port. The same Playwright configuration and assertions were run on isolated port 8790 and passed 16 of 16 tests. The only tracked E2E adjustment changes the expected runtime asset name to `bodygraph-original-template.svg`.
- `npm run ios:sync` passed and copied the new SVG with the same SHA-256 as the source. `npm run ios:build` completed with `BUILD SUCCEEDED` for the simulator.

Ten local review screenshots were generated from the built product at mobile, desktop, poster-save, privacy, sparse-definition, dense-definition, Personality-dominant, Design-dominant, and grayscale states. Their manifest is `build/review/phase-6e-a3/screenshots-manifest.json`. Each captured chart reported 64 gates and 36 channels, the fixture set spanned 2 through 8 defined centers, and automated label-overflow checks reported zero failures. Visual inspection found no incoherent center-label, gate-label, channel-track, half-channel, privacy-state, or grayscale overlap.

A development-signed Release Archive was created at `build/review/phase-6e-a3/PlutoLifeManual.xcarchive` without provisioning updates or changes to signing assets. `codesign --verify --deep --strict` passed for the archived app. Its package audit confirmed:

- bundle identifier `com.yonge6.plutolifemanual`, version `1.1.0`, build `1`, and minimum iOS `15.0`;
- the app, Capacitor, and Cordova privacy manifests;
- Swiss Ephemeris WASM and three `.se1` ephemeris files;
- the packaged Phase 6B native remote-feature availability gate, byte-identical to its source module;
- exactly one `bodygraph-original-template.svg`, matching the source SHA-256;
- no legacy asset filename, `node_modules` directory, private key, or `ExportOptions.plist`;
- only the expected `embedded.mobileprovision` inside the development-signed app.

The screenshots and archive are ignored local review artifacts and are not part of the A3 commit.
