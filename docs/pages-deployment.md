# Manual GitHub Pages Deployment

The `Deploy Pages` workflow publishes only the static Web application. It is manually triggered and always builds current `main`.

## Initial Cutover / 首次迁移

> **Do not merge the release-governance PR while Pages still publishes from the `main` branch. Doing so will cause one final unintended automatic production deployment.**
>
> **Pages 发布源仍为 `main` 分支时，不要合并发布治理 PR，否则此次合并仍会造成最后一次非预期自动生产发布。**

Complete the first cutover in this exact order:

1. Create the Phase 3 pull request.
2. Wait for `engine-web`, `api`, and `supabase` to pass.
3. Keep the pull request open and unmerged.
4. An administrator changes **Settings -> Pages -> Source** to **GitHub Actions** before merging the pull request.
5. Confirm the custom domain remains `human-design.wonderelian.com`.
6. Enable **Enforce HTTPS**, or document why it cannot be enabled.
7. Restrict the `github-pages` Environment to `main` and remove the `gh-pages` branch policy.
8. Configure supported approvals and administrator-bypass restrictions.
9. Merge the Phase 3 pull request using a Merge Commit.
10. Confirm that the merge did not trigger a Pages deployment.
11. The first manual **Deploy Pages** run is allowed only after the governance pull request has been merged and a production release is approved.

## Required one-time repository settings

An administrator must complete these steps in GitHub. They are not automated by this repository change.

### Pages source

Before merging the Phase 3 pull request, open **Settings -> Pages -> Build and deployment -> Source** and select **GitHub Actions**. Do not leave the source as **Deploy from a branch / main**.

### Custom domain

In Pages settings, confirm the custom domain remains:

```text
human-design.wonderelian.com
```

Confirm DNS is unchanged, the domain remains verified, HTTPS is enabled, and **Enforce HTTPS** is on. Do not rely only on a repository `CNAME` file.

### Production Environment

Open **Settings -> Environments -> github-pages**. Where the account plan supports them, configure:

- a required reviewer;
- deployment branches restricted to `main`;
- the existing `gh-pages` deployment branch removed;
- administrator bypass disabled or limited;
- the workflow initiator unable to self-approve when practical.

Some protection rules depend on GitHub account and repository plan. Record unsupported rules instead of claiming they are active.

## Manual deployment

1. Confirm `main` CI is green and complete [the release checklist](release-checklist.md).
2. Open **Actions -> Deploy Pages -> Run workflow**.
3. Keep the workflow branch selector on `main`; the workflow itself also checks out `main` and provides no arbitrary-ref input.
4. Confirm the `github-pages` Environment deployment when approval is requested.
5. Open the deployment URL shown by the `deploy` Job.

The build compares checked-out `HEAD` with `origin/main`. It injects the full SHA, package version, UTC build time, and `production` environment into `runtime-config.js`. `npm audit`, the complete test suite, security tests, the Web build, and Pages artifact verification must all pass before upload.

## Verify the deployed source

1. Record the workflow run URL, deployed commit, and UTC deployment time.
2. On the legal page, confirm Version, full Commit, Build Date, AGPL license, and Open Source link are visible.
3. Compare the displayed commit with the workflow's checked-out commit and the GitHub deployment history.
4. Confirm the deployment URL and `https://human-design.wonderelian.com` serve the same release.

## Asset and discovery checks

- Open `/assets/pluto-og-1200x630.png` and confirm HTTP 200, correct 1200 x 630 composition, no text clipping, no user data, and no third-party BodyGraph path.
- Open `/robots.txt` and `/sitemap.xml`.
- Inspect the page source and confirm Open Graph and Twitter metadata use the dedicated share image.
- Confirm the GitHub source link and AGPL license remain reachable.

## Deployment history

Use **Actions -> Deploy Pages** for workflow runs and **Settings -> Environments -> github-pages** for production deployment history. The recorded commit, workflow artifact, and page provenance must agree.

## Rollback

Create a revert commit on `main`, wait for CI, and manually run `Deploy Pages` again. The workflow intentionally has no input for arbitrary branches or historical commits.

## Post-deployment smoke test

1. Home page opens successfully.
2. Chinese and English switching works.
3. Year, month, day, time, and AM/PM start empty.
4. Privacy mode starts enabled.
5. Local history starts disabled.
6. Local Human Design generation works.
7. Swiss Ephemeris WASM loads successfully.
8. The mobile form scrolls naturally.
9. Image saving and sharing work.
10. Open Source, License, and Commit are visible.
11. The Open Graph image URL returns HTTP 200.
12. Sitemap and robots files are reachable.
13. The local tool remains usable when backend runtime configuration is empty.
14. The browser console contains no serious errors.

## Explicitly excluded

This workflow does not deploy or configure the Node API, Supabase migrations, Edge Functions, database, DNS, data-cleanup schedules, or any other backend production service. Browser runtime configuration remains empty unless a separate approved release process supplies public values; service-role keys and database secrets are never valid browser configuration.
