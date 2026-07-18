# Production Release Checklist

## Initial Cutover / 首次迁移

> **Do not merge the release-governance PR while Pages still publishes from the `main` branch. Doing so will cause one final unintended automatic production deployment.**
>
> **Pages 发布源仍为 `main` 分支时，不要合并发布治理 PR，否则此次合并仍会造成最后一次非预期自动生产发布。**

Complete this one-time checklist before merging the Phase 3 pull request:

- [ ] Phase 3 PR CI is green (`engine-web`, `api`, and `supabase`).
- [ ] Pages Source was changed to **GitHub Actions** before the PR merge.
- [ ] The `github-pages` Environment allows only `main`.
- [ ] `gh-pages` was removed from allowed deployment branches.
- [ ] The custom domain remains `human-design.wonderelian.com`.
- [ ] **Enforce HTTPS** is enabled, or the reason it cannot be enabled is recorded.
- [ ] The Phase 3 PR remains unmerged until every preceding cutover item is complete.
- [ ] The Phase 3 PR is merged with a Merge Commit.
- [ ] Merging Phase 3 produced no automatic Pages deployment.
- [ ] The first manual **Deploy Pages** run occurs only after the governance PR is merged and a release is approved.

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
