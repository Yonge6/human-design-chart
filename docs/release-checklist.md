# Production Release Checklist

## Before deployment

- [ ] `main` CI is green.
- [ ] The release commit on `main` is confirmed.
- [ ] There are no unresolved critical security findings.
- [ ] No production secret can enter the Web build.
- [ ] The Open Graph image is correct and free of user data.
- [ ] Source, License, Version, Commit, and Build Date are visible.
- [ ] The privacy policy matches actual application behavior.
- [ ] `human-design.wonderelian.com` and its DNS configuration are healthy.
- [ ] Pages source is **GitHub Actions**, not branch deployment.
- [ ] The `github-pages` Environment protections are configured and approved.

## Deploy

- [ ] Manually trigger **Deploy Pages**.
- [ ] Confirm the workflow checks out current `main`.
- [ ] Confirm build provenance contains the exact deployed commit.
- [ ] Confirm all build and artifact-verification steps pass.

## After deployment

- [ ] Perform the smoke test in [Pages deployment](pages-deployment.md).
- [ ] Confirm the custom domain still uses HTTPS.
- [ ] Record the deployment commit and UTC time.
- [ ] Record the Actions run and deployment URLs.

## Release record

```text
Commit:
Version:
UTC deployment time:
Actions run:
Deployment URL:
Approved by:
Smoke test result:
```
