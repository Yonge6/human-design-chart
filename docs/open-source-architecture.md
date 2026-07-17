# Open-source architecture

```text
Browser / Capacitor                    Node API
        |                                 |
        +------- shared engine -----------+
                  src/engine/
                       |
             Swiss Ephemeris WASM + SE1

Browser-only layers
  src/renderer/   BodyGraph and poster
  src/services/   sharing, storage, location, optional backend
  app.js          UI orchestration and readings

Optional open-source backend
  Supabase Auth -> Edge Functions -> PostgreSQL with RLS
```

The calculation and snapshot modules contain no DOM access. The API and browser import the same engine and snapshot builder. `api/node-file-fetch.mjs` only adapts local WASM/ephemeris asset loading to Node; it does not implement a second algorithm or a fallback.

Rendering is independent from astronomy: `src/renderer/bodygraph-renderer.js` paints an injected SVG template from engine results, while `src/renderer/poster-renderer.js` captures the page-owned export element. Replacing the transitional SVG does not change the engine or API.

Sharing, local storage, runtime configuration, and cloud calls are independent services. Cloud settings are optional. If backend or API configuration is absent or unavailable, browser calculation and exports continue locally.

## Remaining staged cleanup

The large `app.js` still owns UI copy and reading composition. A later low-risk refactor may move form/result/history/consent controllers and bilingual copy into the proposed `src/app/` and `src/i18n/` directories. That change is deliberately separate from engine extraction so current output and fixtures remain stable.
