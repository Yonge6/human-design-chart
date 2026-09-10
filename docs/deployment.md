# Deployment

## Secure-context requirement

The production Web app must be served over HTTPS. On ordinary HTTP outside Capacitor, the UI intentionally runs in local-only mode and skips all backend-service calls, including Supabase anonymous authentication, consent updates, chart uploads, analytics, and cloud deletion. Saved cloud and analytics preferences are masked rather than overwritten, so they can resume when the user returns to a trusted runtime.

Capacitor native builds are treated as trusted native runtimes. Verify the reported platform before shipping. The browser's pure JavaScript SHA-256 fallback preserves the same deterministic chart hash where Web Crypto is unavailable; it is not transport encryption and must never be cited as a replacement for HTTPS.

## Web

As verified on 2026-09-10, `human-design.wonderelian.com` is served by Alibaba-hosted Nginx from `/srv/wonderelian/human-design.wonderelian.com`. Merging to `main` or completing `Deploy Pages` does not publish to this origin. The older [Pages deployment guide](pages-deployment.md) describes an alternative host, not the current production route.

Build `dist/` from the reviewed main commit with `PLUTO_GIT_COMMIT`, `PLUTO_BUILD_DATE` (UTC), and `PLUTO_ENVIRONMENT=production`. Preserve the current backend configuration; empty API and Supabase values mean local-only operation. Never put a service-role key in browser variables.

For the current origin, stage the exact artifact beside the site root, verify every file against a SHA-256 manifest, verify the existing production commit, and run `nginx -t`. Atomically exchange the two directories, retain the previous directory under `/srv/wonderelian/backups/`, and roll back on failed origin HTTP readback. Do not modify sibling sites or shared Nginx configuration. After publication, read the public HTTPS runtime configuration and compare all public asset hashes with the artifact; a successful copy alone is not release acceptance.

## API

Run `npm run build:api`, then `node api/server.mjs` from `dist-api/` behind HTTPS at `https://api-human-design.wonderelian.com`. Set `PLUTO_CORS_ORIGINS`, provenance variables, host/port, and a production gateway rate limiter. The in-process `Map` limiter is single-instance only and ignores `X-Forwarded-For`; the trusted gateway must apply client-aware distributed limiting. Run `npm run test:api` against the exact release environment before deployment.

## Supabase

1. Create a Supabase project and enable anonymous sign-ins.
2. Apply all versioned migrations with `supabase db push` (or run `supabase db reset` only in a disposable environment).
3. Deploy `save-chart`, `record-event`, `update-consent`, and `delete-cloud-data`.
4. Set Edge Function `PLUTO_CORS_ORIGINS`; keep the service-role key only in Supabase secrets.
5. Put only project URL and publishable/anon key in web build variables.
6. Run RLS integration tests against a disposable project before production.
7. Schedule `select * from public.cleanup_expired_privacy_records();` once per day. Supabase Cron may run this SQL after the operator explicitly enables `pg_cron`; otherwise use a daily trusted maintenance job with a service-role database connection. The repository migration deliberately does not require `pg_cron`, so local and alternative PostgreSQL deployments remain portable. Monitor failures: anonymous events must expire after 180 days and deletion receipts after 365 days.

The Edge Functions centrally allow only `https://human-design.wonderelian.com`, the two port-8789 local origins, and `capacitor://localhost` unless `PLUTO_CORS_ORIGINS` overrides them. They also reject disallowed `Origin` values on the actual write request. Supabase CLI's local Kong currently adds a wildcard CORS header at its outer gateway even though direct function responses are origin-specific. Before production, verify the public hosted/custom gateway end to end; production readiness requires the exposed gateway not to replace the function allowlist with permissive CORS. Put a restrictive reverse proxy in front if the hosted gateway cannot satisfy that requirement.

## DNS

Point the web hostname to the static host and the API hostname to the Node service. Keep them separate so proprietary consumers use only HTTPS/JSON.

## iOS

After the web build, run `npm run ios:sync` and then the unsigned simulator build or Xcode archive. Runtime configuration is copied with the web assets. Verify native image saving, system sharing, offline history, and local calculation before release.

## Rollback and source correspondence

Tag released commits. Retain the exact build command, lockfile, environment variable names (not secret values), and artifact digest. A rollback must update displayed provenance to the source commit that produced the rollback artifact.
