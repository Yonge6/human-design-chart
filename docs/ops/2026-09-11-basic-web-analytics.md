# Basic website analytics repair

- Actor: Codex, with the owner's explicit confirmation in the operations thread.
- Source: production HTML, analytics.js, app.js, and the official GA4 Data API readback through 2026-09-10.
- Action: separate public H5 visit measurement from opt-in product interaction events; restrict measurement to production HTTPS Web; fix page context to exclude birth/query/referrer data; disable advertising features; disclose first-party identifier cookies in Chinese and English.
- Result: product events still require explicit opt-in. Historical Human Design metrics remain null; no historical backfill is claimed. A denied storage default alone does not prove the cause of missing reports, because consent mode can send cookieless pings.
- Status: implementation validated locally; production acceptance recorded separately in the portfolio operations log after deployment.
