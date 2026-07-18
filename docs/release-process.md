# Release Process

This repository separates code integration from production release and deployment.

```text
Development branch
  -> Pull Request
  -> engine-web / api / supabase CI
  -> Merge Commit to main
  -> no automatic production release
  -> human release approval
  -> manually run Deploy Pages
  -> verify the production website
```

## Initial Cutover / 首次迁移

> **Do not merge the release-governance PR while Pages still publishes from the `main` branch. Doing so will cause one final unintended automatic production deployment.**
>
> **Pages 发布源仍为 `main` 分支时，不要合并发布治理 PR，否则此次合并仍会造成最后一次非预期自动生产发布。**

The one-time migration must happen in this order:

1. Create the Phase 3 release-governance pull request.
2. Wait for `engine-web`, `api`, and `supabase` to pass.
3. Keep the pull request open and unmerged.
4. Before merging, an administrator changes **Settings -> Pages -> Source** from branch publishing to **GitHub Actions**.
5. Confirm the custom domain remains `human-design.wonderelian.com`.
6. Enable **Enforce HTTPS**, or record why it cannot be enabled.
7. Restrict the `github-pages` Environment to `main` and remove `gh-pages` from its allowed deployment branches.
8. Configure all available approval rules and administrator-bypass restrictions.
9. Use a Merge Commit to merge the Phase 3 pull request.
10. Confirm that the merge did not create a Pages deployment.
11. Only after the governance pull request is merged, manually run **Deploy Pages** when the production release is approved.

This cutover order applies only to the first transition from legacy branch publishing. Afterward, normal merges remain non-deploying and every production Pages deployment remains a separate manual decision.

## Terms

- **Merge** moves reviewed code into `main`. It does not authorize a production release.
- **Release** is the human decision that a specific `main` commit is ready for users.
- **Deploy** publishes the reviewed Web artifact to GitHub Pages through the manual `Deploy Pages` workflow.
- **Backend deploy** covers the Node API, Supabase migrations, Edge Functions, database maintenance, and related infrastructure. It is a separate future process and is never performed by the Pages workflow.

## Governance rules

1. Changes enter `main` through a reviewed pull request and a Merge Commit.
2. The normal `Test` workflow runs on pull requests and pushes to `main`; it has no Pages write permission or deployment step.
3. A release operator confirms the exact `main` commit and completes [the release checklist](release-checklist.md).
4. The operator manually starts `Deploy Pages` and approves the `github-pages` Environment when required.
5. The workflow checks out current `main`, confirms it matches `origin/main`, injects the full commit SHA into build provenance, runs release checks, and uploads only `dist/`.
6. The operator performs the documented smoke test and records the deployed commit and UTC time.

## Rollback

Do not deploy an arbitrary branch or historical ref. Create a revert commit on `main`, allow normal CI to pass, then manually run `Deploy Pages` again. The newly deployed artifact must display the revert commit in its build provenance.

## Repository settings boundary

Workflow code cannot change repository release policy by itself. An administrator must switch Pages from branch deployment to **GitHub Actions** and configure the `github-pages` Environment as described in [Pages deployment](pages-deployment.md). Do not claim release separation is active until those settings are confirmed.
