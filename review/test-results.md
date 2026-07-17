# Final acceptance test results

Acceptance base: `1442fb1cd5c1d94633018afce9f38d412c4cf604`  
Acceptance fix commit: `967c3b2be6e69536549aa6a8b04d825d2fff3dab`

| Command | Result | What it exercised |
|---|---|---|
| `npm install` | Pass; 111 packages audited | Reproducible npm install |
| `npm audit` | Pass; 0 vulnerabilities | npm advisory database |
| `npm test` | Pass; 45/45, 0 skipped | Unit, regression, API, schema, privacy, UI, BodyGraph isolation, build security |
| `npm run test:schema` | Pass; 5/5 | Real Swiss Ephemeris snapshot, JSON Schema, real-result hash invariants |
| `npm run test:api` | Pass; 11/11 | Real local HTTP API and Swiss Ephemeris success path; injected failures only for engine-unavailable/internal-error branches |
| `npm run test:privacy` | Pass; 4/4 | Default-off behavior, event filtering, RLS/source guards |
| `npm run test:security` | Pass; 3/3 | Web/API artifact secret scans, provenance, AGPL metadata/notices |
| `npm run test:supabase` | Pass; 7/7 | Real local Auth, anonymous JWTs, PostgREST, PostgreSQL/RLS and Edge Runtime; no database or function mocks |
| `npx supabase db lint --level warning` | Pass; no schema errors | Local PostgreSQL schema lint |
| `npm run build` | Pass | Static Web production structure |
| `npm run build:api` | Pass | Standalone API package with license/notices |
| `npm run ios:sync` | Pass | Capacitor Web asset and SPM sync |
| `npm run ios:build` | Pass; `BUILD SUCCEEDED` | Unsigned generic iOS Simulator build |

Swiss Ephemeris 2.10.03 was actually initialized by engine, API, and schema success-path tests. Supabase integration tests used two newly created anonymous users and real signed access tokens. Location provider unit tests mock remote geocoder responses; API exception tests inject failures to reach otherwise destructive error branches. No test is skipped, marked todo, or known flaky.

Warning: Xcode emitted `IDERunDestination: Supported platforms for the buildables in the current scheme is empty`, then resolved the package graph and completed the generic simulator build successfully.
