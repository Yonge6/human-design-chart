# Supabase verification

Supabase CLI `2.109.1` was run against the local Docker stack. `supabase db reset` completed from an empty database twice consecutively after the final migration change. `supabase db lint --level warning` reported no schema errors.

## Catalog verification

- Six requested core tables exist: `app_users`, `consent_records`, `chart_records`, `product_events`, `admin_users`, `admin_audit_logs`.
- `data_deletion_audit_logs` is an additional protected deletion-receipt table.
- All seven public tables have RLS enabled.
- `pgcrypto`, required indexes, constraints, four database functions, and the `app_users_set_updated_at` trigger exist.
- No production-only extension is required.

## Real two-user tests

Two separate anonymous Auth identities and JWTs verified owner-only profiles, consent and charts in both directions. Cross-user reads returned no rows; cross-user updates/deletes changed no rows. Ordinary clients cannot enumerate `product_events`, read admin tables, or read deletion receipts.

Cloud chart inserts require the latest `cloud_save` consent in both RLS and `save-chart`. Analytics inserts require the latest `product_analytics` consent in both RLS and `record-event`. Grant, withdrawal, post-withdrawal denial, chart deduplication, event allowlists, forbidden personal fields, unknown fields and oversized payloads were exercised through the real Edge gateway.

Deletion used the authenticated token identity, ignored/rejected forged `user_id`, removed only that identity's cloud rows, left the second user unchanged, and reported `localHistoryAffected: false`. The retained receipt contains only a one-way subject hash, request ID, deleted-chart count and timestamp; submitted birth fields did not appear in the receipt or Edge Runtime logs.

## CORS

Direct Edge Runtime preflight responses use the central exact allowlist. All four actual functions reject disallowed origins before mutation. Supabase CLI's outer local Kong adds its own wildcard header; therefore the public hosted/custom production gateway must be re-tested and must preserve a restrictive policy before launch.
