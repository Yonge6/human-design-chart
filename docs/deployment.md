# Deployment

## Web

```bash
npm ci
npm test
PLUTO_APP_VERSION=1.0.0 \
PLUTO_GIT_COMMIT="$(git rev-parse HEAD)" \
PLUTO_BUILD_DATE="$(date -u +%FT%TZ)" \
PLUTO_ENVIRONMENT=production \
npm run build
```

Publish `dist/` to `https://human-design.wonderelian.com`. The build creates `runtime-config.js`; no configured API or Supabase values means local-only operation. Never put a service-role key in any `PLUTO_*` browser variable.

## API

Run `node api/server.mjs` behind HTTPS at `https://api-human-design.wonderelian.com`. Set `PLUTO_CORS_ORIGINS`, provenance variables, host/port, and a production gateway rate limiter. The working directory must include the vendored WASM and ephemeris files. Run `npm run test:api` in the exact container/image before deployment.

## Supabase

1. Create a Supabase project and enable anonymous sign-ins.
2. Apply `supabase/migrations/202607180001_open_source_backend.sql`.
3. Deploy `save-chart`, `record-event`, `update-consent`, and `delete-cloud-data`.
4. Set Edge Function `PLUTO_CORS_ORIGINS`; keep the service-role key only in Supabase secrets.
5. Put only project URL and publishable/anon key in web build variables.
6. Run RLS integration tests against a disposable project before production.

## DNS

Point the web hostname to the static host and the API hostname to the Node service. Keep them separate so proprietary consumers use only HTTPS/JSON.

## iOS

After the web build, run `npm run ios:sync` and then the unsigned simulator build or Xcode archive. Runtime configuration is copied with the web assets. Verify native image saving, system sharing, offline history, and local calculation before release.

## Rollback and source correspondence

Tag released commits. Retain the exact build command, lockfile, environment variable names (not secret values), and artifact digest. A rollback must update displayed provenance to the source commit that produced the rollback artifact.
