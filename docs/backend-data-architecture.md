# Backend data architecture

The optional backend is only for this open-source tool. It uses Supabase anonymous Auth, PostgreSQL, Row Level Security, and Edge Functions. It does not store AI conversations, payments, CRM, commercial profiles, or future proprietary-product data.

## Tables

- `app_users`: minimal row keyed to `auth.users.id`.
- `consent_records`: append-only consent state and version.
- `chart_records`: explicitly opted-in personal fields, versioned snapshots, and server-controlled verification provenance.
- `product_events`: allowlisted anonymous product actions with constrained metadata.
- `admin_users`: separately provisioned administrative membership.
- `admin_audit_logs`: administrative action records without chart payloads.
- `data_deletion_audit_logs`: deletion receipts containing only a one-way subject hash, request ID, aggregate counts, and timestamp; receipts expire after 365 days.

All seven tables have RLS enabled. Authenticated clients may read their own charts but cannot insert or update `chart_records`, and they cannot directly insert `product_events`. Those writes use service-role-only, consent-aware RPCs behind authenticated Edge Functions. Users cannot enumerate product events. Deletion receipts have no user-facing policy. Admin access is gated by `is_pluto_admin()` and should be accompanied by audit records in any future admin UI.

## Edge Functions

- `save-chart`: authenticates the anonymous user, strictly validates snapshot versions, enums, activation ranges, channels, centers and variables, recomputes the canonical hash, rejects `engine_verified`, requires current cloud-save consent, and writes `client_asserted` through a controlled RPC.
- `record-event`: requires current analytics consent and accepts only enumerated property values; arbitrary strings, personal text, unknown fields and direct table inserts are rejected by both Edge and PostgreSQL.
- `update-consent`: records both independent switches whenever consent is granted or withdrawn.
- `delete-cloud-data`: invokes one atomic, idempotent database function. It deletes only the token identity's charts, consent and cloud profile, deidentifies existing product events, records a birth-data-free receipt, and reports that local history is unaffected.

Deidentified product events expire after 180 days. Deletion receipts expire after 365 days. `cleanup_expired_privacy_records()` enforces both windows and must be scheduled daily by the operator.

The service-role key exists only inside the Edge Function environment. Browsers receive only a publishable/anon key. Functions never return database errors or log sensitive request bodies.

## Failure model

Backend calls are optional side effects. Missing configuration, auth failure, network failure, migration failure, or function failure cannot block local calculation, rendering, image export, or local history. Cloud saving and analytics are separately disabled by default.
