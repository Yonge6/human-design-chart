# Deployment readiness

## Ready

- Local-first Web calculation and poster generation remain independent of API/Supabase availability.
- Node API success paths use the shared Swiss Ephemeris engine and package all required source assets, AGPL license and third-party notices.
- Web provenance is injected from `PLUTO_APP_VERSION`, `PLUTO_GIT_COMMIT` and `PLUTO_BUILD_DATE`.
- Local Supabase migrations, Auth, JWT, RLS and Edge Functions pass real integration tests.
- Capacitor sync and unsigned iOS simulator build pass.
- BodyGraph rendering is isolated from astronomy, chart classification, API and schema.

## Production gates still open

The Swiss Ephemeris AGPL licensing path is selected and documented. The project
does not claim or rely on a Swiss Ephemeris Professional License. Before App
Store distribution, the release must verify fulfillment of the applicable AGPL
source-code, license, notice, and distribution obligations, and separately
assess App Store distribution compatibility under that path.

1. Provision the production API host and `api-human-design.wonderelian.com` DNS/TLS.
2. Add gateway-level distributed rate limiting; the Node `Map` limiter is single-instance only.
3. Verify hosted/custom gateway CORS. The final exposed sensitive write endpoints must not rely on the Supabase CLI Kong wildcard behavior.
4. Configure the production Supabase project, anonymous Auth, publishable key, Edge secrets and exact origin allowlist; rerun `test:supabase` against a disposable staging project first.
5. Define retention/deletion operations for product events and deletion receipts.
6. Preserve build provenance and artifact digests for every deployment/tag.
7. Verify Swiss Ephemeris AGPL source-code, license, notice, and distribution
   obligations against the final release and separately assess App Store
   compatibility. No separate Astrodienst authorization, legal opinion, Apple
   compatibility confirmation, or complete closure of risk is represented.
8. Complete the planned style-preserving, clean-room, independently generated
   BodyGraph replacement because no usable source-authorship evidence or
   applicable authorization is currently available. Phase 6E has not started,
   and the current `DERIVED_OR_UNCLEAR` SVG must not enter the final App Store
   Release Candidate.

No production secret, database content, log or backup is included in this review bundle. The generated format patch covers source changes through `967c3b2`; the later review-artifact commit is intentionally not self-embedded in that patch.
