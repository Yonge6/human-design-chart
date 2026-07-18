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
