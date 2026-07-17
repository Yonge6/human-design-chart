# Supabase backend

This directory contains the complete optional backend for the open-source Pluto tool.

```bash
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
npm run test:supabase
```

Enable anonymous Auth. Deploy the migration and the four functions under `functions/`. Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Supabase; the service-role key must never enter browser assets, `.env.example`, logs, or Git.

`npm run test:supabase` uses two real anonymous JWT sessions against the local Auth, REST, PostgreSQL/RLS, and Edge Function stack. It also reaches the Edge Runtime directly for exact CORS preflight verification because Supabase CLI's outer local Kong installs its own wildcard CORS plugin. Provision administrators manually after identity verification. `seed.sql` intentionally contains no accounts or personal data.
