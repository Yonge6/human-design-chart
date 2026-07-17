# Backend data architecture

The optional backend is only for this open-source tool. It uses Supabase anonymous Auth, PostgreSQL, Row Level Security, and Edge Functions. It does not store AI conversations, payments, CRM, commercial profiles, or future proprietary-product data.

## Tables

- `app_users`: minimal row keyed to `auth.users.id`.
- `consent_records`: append-only consent state and version.
- `chart_records`: explicitly opted-in personal fields and versioned snapshots.
- `product_events`: allowlisted anonymous product actions with constrained metadata.
- `admin_users`: separately provisioned administrative membership.
- `admin_audit_logs`: administrative action records without chart payloads.

All six tables have RLS enabled. Users can read and mutate only their own cloud charts and consent/profile rows. Users can insert allowlisted events but have no policy permitting them to enumerate product events. Admin access is gated by `is_pluto_admin()` and should be accompanied by audit records in any future admin UI.

## Edge Functions

- `save-chart`: authenticates the anonymous user, validates field allowlists and hash format, records cloud-save consent, and upserts the user's chart.
- `record-event`: validates the exact event allowlist and rejects sensitive fields before recording analytics consent/event.
- `update-consent`: records both independent switches whenever consent is granted or withdrawn.
- `delete-cloud-data`: deletes the current identity's charts and consent records; it explicitly reports that local history is unaffected.

The service-role key exists only inside the Edge Function environment. Browsers receive only a publishable/anon key. Functions never return database errors or log sensitive request bodies.

## Failure model

Backend calls are optional side effects. Missing configuration, auth failure, network failure, migration failure, or function failure cannot block local calculation, rendering, image export, or local history. Cloud saving and analytics are separately disabled by default.
