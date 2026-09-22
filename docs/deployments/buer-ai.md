# 不二见己 DeepSeek production deployment

2026-09-22: user authorized creating a dedicated provider key and publishing live chat.

- Key label: Buer Jianji Production. Secret stays outside repository and browser bundle; server environment file `/etc/buer-jianji/api.env` is root-only mode 600.
- Provider: official DeepSeek HTTPS API, `deepseek-flash`, non-thinking streaming, existing bounded messages/output, timeout and abort handling.
- API: `https://buer-api.wonderelian.com`, Aliyun A record to 8.130.104.221, service `buer-jianji-api`, loopback 8796. Nginx exposes only chat/status and applies client-IP limiting; server applies concurrency and request limits. Request body access logging is disabled.
- Runtime: `/srv/buer-jianji/current` points to `/srv/buer-jianji/releases/20260922-chat`. Deployment configuration lives in `deploy/buer/`.
- TLS: dedicated Let's Encrypt webroot certificate; existing certbot-renew timer includes Nginx reload. First secondary HTTP validation timed out; second succeeded. No other site's service or key was replaced.
- CORS permits https://buer.wonderelian.com; public preflight returns 204 and disallowed origin returns 403. Frontend CSP permits only the named added API endpoint.
- API was tested through localhost and public HTTPS with actual streamed provider responses ending in done. Browser homepage produced a real work-advice reply and returned to idle; no mocked provider was used.
- 126 tests and H5/native asset guards passed. Public build scanned for the actual dedicated secret with no match.
- Mobile header follows Wendao's direct EN / 中文 button pattern with accessible target-language label and 44px tap target. Local 390px switching in both directions passed with no horizontal overflow.

Rollback: set BUER_CHAT_ENABLED to false in preview builder and republish; stop only buer-jianji-api if needed. Preserve existing products, DNS and credentials. Native source/assets are synchronized, but no App Store submission was performed.

Final browser acceptance: live English question returned an English reply; Chinese and English mobile toggle both passed at 390px with no horizontal overflow. Stop immediately cancels and restores input. A streaming readability issue was observed in the screenshot: replacing message nodes on each delta replayed the entry fade. Removed the message entry animation, retaining the homepage introduction animation.
