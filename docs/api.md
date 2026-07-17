# Human Design API v1

Planned production base URL: `https://api-human-design.wonderelian.com`. Local development: `http://127.0.0.1:8790`.

## Endpoints

### `POST /v1/charts`

Accepts JSON up to 16 KiB:

```json
{
  "birthDate": "1990-01-01",
  "birthTime": "12:00",
  "timezone": "Asia/Shanghai",
  "locationLabel": "Wuhan, China"
}
```

For repeated daylight-saving clock times, retry with `"timeDisambiguation":"earlier"` or `"later"`. Nonexistent local times are rejected.

Success returns a schema-valid `HumanDesignProfileSnapshot`:

```json
{"data":{"schemaVersion":"1.0","engineVersion":"1.0.0","verificationStatus":"engine_verified","chartHash":"sha256:..."},"requestId":"...","error":null}
```

Errors use the same envelope:

```json
{"data":null,"requestId":"...","error":{"code":"INVALID_BIRTH_TIME","message":"birthTime must use 24-hour HH:mm."}}
```

Stable codes: `INVALID_REQUEST`, `INVALID_BIRTH_DATE`, `INVALID_BIRTH_TIME`, `INVALID_TIMEZONE`, `NONEXISTENT_LOCAL_TIME`, `AMBIGUOUS_LOCAL_TIME`, `ENGINE_UNAVAILABLE`, `RATE_LIMITED`, and `INTERNAL_ERROR`.

### `GET /v1/health`

Returns only service status. It does not expose paths, credentials, dependency versions, or environment variables.

### `GET /v1/version`

Returns app, schema, engine, commit, and build versions used by the deployment.

## Runtime and precision

The Node service imports `src/engine/human-design-engine.js`, the same module used by the browser. Node's adapter serves local WASM and ephemeris files to the browser-oriented Swiss Ephemeris loader. Tests call the real service and compare its complete result to a direct shared-engine snapshot. There is no Moshier fallback.

## Security and privacy

- Requests are limited to explicit fields and lengths.
- CORS uses `PLUTO_CORS_ORIGINS`; sensitive endpoints never return `Access-Control-Allow-Origin: *`.
- A per-process `Map` limiter defaults to 30 chart requests/minute/socket address. It is a single-instance safety net, not production-grade distributed rate limiting. Multi-instance production must add Cloudflare, a trusted reverse proxy, a managed platform limiter, or a Redis-backed limiter.
- The Node process deliberately ignores `X-Forwarded-For` and never persists an IP. A trusted gateway must perform client-aware limiting before proxying; do not enable blanket proxy trust in the app process.
- Logs must contain request ID, route, status, latency, and coarse error code only. Do not log request bodies, names, birth details, places, snapshots, or stack traces.
- Responses never expose server stacks.
- The API is stateless and does not save chart requests to Supabase.

See `openapi/human-design-api-v1.yaml` for the machine-readable contract.
