# Pluto Human Design

Pluto Human Design is a complete, self-hostable Human Design calculation, BodyGraph, poster, basic-reading, and open API tool. It keeps the existing browser-first product usable offline while exposing the same versioned engine through a separately deployable HTTPS/JSON API.

The project includes Swiss Ephemeris integration, historical IANA time-zone conversion, Personality and Design activations, Gate/Line/Color/Tone/Base, type, strategy, authority, definition, profile, incarnation cross, BodyGraph rendering, bilingual UI, local history, privacy controls, and an optional open-source Supabase backend.

This project is licensed under the GNU Affero General Public License version 3 or later. The Swiss Ephemeris components used by this project are distributed under the AGPL licensing option described by Astrodienst.

## Quick start

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm test
npm run build
python3 server.py
```

Open `http://127.0.0.1:8789/`. Calculation and poster generation remain local and do not require the API or Supabase.

## Commands

```bash
npm test              # all unit, regression, schema, API, privacy, and UI tests
npm run test:schema   # snapshot protocol and deterministic hash tests
npm run test:api      # starts a real local API and calls Swiss Ephemeris
npm run test:supabase # real local Auth, JWT, RLS, PostgreSQL, and Edge tests
npm run build         # static web build in dist/
npm run build:api     # standalone API package in dist-api/
npm run api:start     # local API on 127.0.0.1:8790
npm run ios:sync      # build and sync the Capacitor iOS project
npm run ios:build     # unsigned iOS simulator build
```

## Web and iOS

The web app is native HTML, CSS, and JavaScript. It calculates locally with the same engine modules used by the API. The iOS app is a Capacitor shell with native Save to Photos and system sharing; run `npm run ios:sync` after every web change.

Open the iOS project with `npx cap open ios`. The current bundle ID is `com.yonge6.plutolifemanual`. See [the iOS roadmap](docs/ios-app-roadmap.md).

## Open API

Run the local server:

```bash
npm run api:start
```

```bash
curl -X POST http://127.0.0.1:8790/v1/charts \
  -H 'Content-Type: application/json' \
  -d '{
    "birthDate":"1990-01-01",
    "birthTime":"12:00",
    "timezone":"Asia/Shanghai",
    "locationLabel":"Wuhan, China"
  }'
```

The endpoint executes the repository's shared Swiss Ephemeris engine; it does not use Moshier or a second approximation. See [API documentation](docs/api.md), [OpenAPI](openapi/human-design-api-v1.yaml), and the [HTTP client example](examples/http-client/client.js).

## Profile snapshot

Every API chart is an `engine_verified` `HumanDesignProfileSnapshot` containing `schemaVersion`, `engineVersion`, a deterministic `chartHash`, normalized input, core properties, activations, structure, and calculation metadata. Browser cloud saves are marked `client_asserted` after strict structure and hash validation and are not a substitute for server recalculation. The stable v1 contract is defined in [JSON Schema](schemas/human-design-profile-v1.schema.json) and [the schema guide](docs/human-design-profile-schema.md).

## Privacy

- Local calculation, image generation, and local history are the default.
- Cloud chart saving is off by default and requires explicit consent.
- Anonymous product analytics are a separate switch and are off by default.
- Place-search text is sent only when the user searches for a location.
- Cloud deletion and local-history deletion are independent.
- Production keys, production data, logs, and backups are not source code and must never be committed.

The optional backend uses Supabase Auth, PostgreSQL, RLS, and Edge Functions. Its migrations and functions are fully open source under [`supabase/`](supabase/). See [backend architecture](docs/backend-data-architecture.md) and the [privacy data map](docs/privacy-data-map.md).

## Deployment

Web and API are separate deployments:

- Web: `https://human-design.wonderelian.com`
- Planned API: `https://api-human-design.wonderelian.com`

Use build-time provenance variables so a deployment identifies its source:

```bash
PLUTO_APP_VERSION=1.0.0 \
PLUTO_GIT_COMMIT="$(git rev-parse HEAD)" \
PLUTO_BUILD_DATE="$(date -u +%FT%TZ)" \
npm run build
```

See [deployment instructions](docs/deployment.md) and [source availability](docs/source-availability.md).

## Current limitations

- The Node API is a deployable foundation, but no production API host is provisioned by this repository change.
- The rate limiter is in-memory and should be replaced or supplemented at the production gateway for multi-instance deployments.
- Supabase deployment requires a project, anonymous auth, migrations, function secrets, and explicit CORS configuration.
- The current BodyGraph template is transitional and has an unresolved visual-origin risk. AGPL licensing does not itself resolve that risk. See [the original redesign plan](docs/bodygraph-original-redesign-plan.md).
- Human Design is used here for personal reflection and entertainment. It is not established scientific, medical, psychological, legal, or financial advice.
- This project is independent and is not affiliated with Human Design official organizations or My Human Design.

## Open-source and commercial boundary

This repository contains the complete open-source calculation, rendering, basic reading, API, and this tool's own privacy backend. A future proprietary product may contain AI conversations, long-term memory, subscriptions, CRM, orders, communities, private prompts, or agent orchestration, but those features do not belong here.

A proprietary product may consume this service only through the published HTTPS/JSON API. It must not import the engine, embed Swiss Ephemeris/WASM, package this repository as a submodule, copy the calculation code, share a build artifact or process, or directly access this tool's database tables. See [project boundary](docs/project-boundary.md) and [commercial integration](docs/commercial-integration.md).

This architecture is intended to create a clear technical separation between the open-source Human Design tool and future proprietary products. Final licensing conclusions should be reviewed by qualified legal counsel or confirmed with the relevant rights holders.

## License and third parties

Copyright holders license this repository under **AGPL-3.0-or-later**; see [LICENSE](LICENSE). Network users must be offered the corresponding source as required by the license. Third-party components retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and vendored license files.

Open source refers to the software code, not production user data. Never publish production secrets, database contents, request logs, or backups.
