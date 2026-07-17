# Backend data architecture

The optional backend is only for this open-source tool. It uses Supabase anonymous Auth, PostgreSQL, Row Level Security, and Edge Functions. It does not store AI conversations, payments, CRM, commercial profiles, or future proprietary-product data.

## Tables

- `app_users`: minimal row keyed to `auth.users.id`.
- `consent_records`: append-only consent state and version.
- `chart_records`: explicitly opted-in personal fields and versioned snapshots.
- `product_events`: allowlisted anonymous product actions with constrained metadata.
- `admin_users`: separately provisioned administrative membership.
- `admin_audit_logs`: administrative action records without chart payloads.
- `data_deletion_audit_logs`: immutable deletion receipts containing only a one-way subject hash, request ID, deleted-chart count, and timestamp.

All seven tables have RLS enabled. Users can read and mutate only their own cloud charts and consent/profile rows. Chart and event inserts also require the latest matching consent record at the RLS layer. Users can insert allowlisted events but cannot enumerate them. Deletion receipts have no user-facing policy. Admin access is gated by `is_pluto_admin()` and should be accompanied by audit records in any future admin UI.

## Edge Functions

- `save-chart`: authenticates the anonymous user, validates field allowlists, lengths, date/time/timezone and hash format, requires the latest cloud-save consent, and upserts the user's chart.
- `record-event`: requires the latest analytics consent, validates exact event/property allowlists, and rejects sensitive fields.
- `update-consent`: records both independent switches whenever consent is granted or withdrawn.
- `delete-cloud-data`: deletes only the token identity's charts, consent and cloud profile, records a birth-data-free deletion receipt, and explicitly reports that local history is unaffected.

The service-role key exists only inside the Edge Function environment. Browsers receive only a publishable/anon key. Functions never return database errors or log sensitive request bodies.

## Failure model

Backend calls are optional side effects. Missing configuration, auth failure, network failure, migration failure, or function failure cannot block local calculation, rendering, image export, or local history. Cloud saving and analytics are separately disabled by default.
