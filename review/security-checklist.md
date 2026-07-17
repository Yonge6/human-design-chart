# Security checklist

- [x] All four Edge Functions verify JWTs at the gateway and again resolve the user from the token.
- [x] Request `user_id` is never trusted and unknown top-level fields are rejected.
- [x] Cloud and analytics writes require the latest explicit consent.
- [x] Personal fields, snapshot shape, dates, times, IANA time zones and size limits are validated.
- [x] Event names and event property names are explicit allowlists.
- [x] RLS protects every backend table; direct client policies were tested with two JWT users.
- [x] Ordinary clients cannot enumerate events, admin data or deletion receipts.
- [x] Edge/API responses do not return stack traces or database errors.
- [x] API operational logs contain request ID, route, status, error code and latency only.
- [x] Edge source has no request-body or personal-data logging.
- [x] Service-role credentials are read only inside Edge runtime code.
- [x] Web and API production artifacts contain no injected service key, database password or JWT secret.
- [x] Actual untrusted-origin Edge writes return 403.
- [x] Node API ignores untrusted `X-Forwarded-For`.
- [ ] Production gateway CORS must be verified because local Supabase Kong injects wildcard CORS headers.
- [ ] Production distributed rate limiting must be supplied outside the single-process Node API.
- [ ] Production retention for anonymous events and deletion receipts must be published/configured.
