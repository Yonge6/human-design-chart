# Supabase backend

This directory contains the complete optional backend for the open-source Pluto tool.

```bash
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
```

Enable anonymous Auth. Deploy the migration and the four functions under `functions/`. Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Supabase; the service-role key must never enter browser assets, `.env.example`, logs, or Git.

Before production, test with two different anonymous users: each user must see only their own chart/consent rows, neither may select all product events, and neither may access admin tables. Provision administrators manually after identity verification. `seed.sql` intentionally contains no accounts or personal data.
