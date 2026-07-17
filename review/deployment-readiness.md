# Deployment readiness

## Ready

- Local-first Web calculation and poster generation remain independent of API/Supabase availability.
- Node API success paths use the shared Swiss Ephemeris engine and package all required source assets, AGPL license and third-party notices.
- Web provenance is injected from `PLUTO_APP_VERSION`, `PLUTO_GIT_COMMIT` and `PLUTO_BUILD_DATE`.
- Local Supabase migrations, Auth, JWT, RLS and Edge Functions pass real integration tests.
- Capacitor sync and unsigned iOS simulator build pass.
- BodyGraph rendering is isolated from astronomy, chart classification, API and schema.

## Production gates still open

1. Provision the production API host and `api-human-design.wonderelian.com` DNS/TLS.
2. Add gateway-level distributed rate limiting; the Node `Map` limiter is single-instance only.
3. Verify hosted/custom gateway CORS. The final exposed sensitive write endpoints must not rely on the Supabase CLI Kong wildcard behavior.
4. Configure the production Supabase project, anonymous Auth, publishable key, Edge secrets and exact origin allowlist; rerun `test:supabase` against a disposable staging project first.
5. Define retention/deletion operations for product events and deletion receipts.
6. Preserve build provenance and artifact digests for every deployment/tag.
7. Complete qualified legal review of Swiss Ephemeris/AGPL obligations and the open/proprietary service boundary.
8. Replace or independently clear the transitional BodyGraph visual before claiming commercial visual rights.

No production secret, database content, log or backup is included in this review bundle. The generated format patch covers source changes through `967c3b2`; the later review-artifact commit is intentionally not self-embedded in that patch.
