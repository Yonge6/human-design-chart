# 不二见己独立域名

- Canonical/public URL: https://buer.wonderelian.com/
- Hosting: GitHub Pages, `Yonge6/buer-life-manual-preview`, main root.
- DNS: Alibaba Cloud `wonderelian.com`; `buer CNAME yonge6.github.io`, default routing, TTL 600 seconds. Created 2026-09-22.
- Build: `node scripts/build-buer-preview.mjs`; writes CNAME and new public URL into runtime configuration, canonical/OG URL, sitemap and artifact README.
- Poster QR: `assets/buer-preview-qr.png`, decoded independently using Apple Vision as `https://buer.wonderelian.com/`.
- Source deployment: `c96d7fb`; artifact `cf575fb`; Pages run `35676436347` succeeded.
- AI enabled 2026-09-22: dedicated DeepSeek server at https://buer-api.wonderelian.com. See buer-ai.md.
- Existing apex and `human-design.wonderelian.com` continue to return HTTP 200; no existing records were modified.

## Rollback

Restore the preceding artifact revision and its previous public URL/QR, remove only this repository's custom domain binding/CNAME, and remove only the newly created `buer` DNS record. Do not modify apex or other product subdomains. Source identifiers, app storage and bundle identifiers are unchanged.

## Acceptance (2026-09-22)

- Public DNS independently returns `buer.wonderelian.com CNAME yonge6.github.io`, TTL 600.
- Certificate provisioning needed one remove/reapply after DNS propagation, following GitHub's documented recovery. Certificate is approved, expires 2026-12-21; `https_enforced: true`.
- HTTPS returns 200 with valid host certificate; HTTP returns 301 to HTTPS.
- Eight public HTTPS artifacts match local build bytes (`qa/buer-redesign/domain-live-assets.json`).
- Ego browser confirmed document title 不二见己, secure context, canonical/runtime URL pointing to the new domain, loaded hero and initialized conversation UI. Screenshot: `qa/buer-redesign/domain-live-home.png`.
- Final Pages run `35676736857` succeeded. Artifact HEAD `7f335ae` incorporates GitHub-managed CNAME refresh; product source remains `c96d7fb`.
