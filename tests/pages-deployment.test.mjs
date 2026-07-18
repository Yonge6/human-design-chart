import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("test CI never receives Pages deployment permissions or steps", async () => {
  const workflow = await read(".github/workflows/test.yml");
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /deploy-pages/);
  assert.doesNotMatch(workflow, /pages:\s*write/);
  assert.doesNotMatch(workflow, /id-token:\s*write/);
});

test("Pages deployment is manual, main-only, serialized, and uploads dist", async () => {
  const workflow = await read(".github/workflows/deploy-pages.yml");
  assert.match(workflow, /name: Deploy Pages/);
  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s{2}(?:push|pull_request|schedule):/m);
  assert.match(workflow, /group: pages-production\s*\n\s*cancel-in-progress: false/);
  assert.match(workflow, /ref: main/);
  assert.doesNotMatch(workflow, /inputs:/);
  assert.match(workflow, /git rev-parse origin\/main/);
  assert.match(workflow, /PLUTO_GIT_COMMIT=\$DEPLOY_COMMIT/);
  assert.match(workflow, /npm ci[\s\S]*npm audit[\s\S]*npm test[\s\S]*npm run test:security[\s\S]*npm run build[\s\S]*npm run test:pages/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4[\s\S]*path: dist/);
  assert.match(workflow, /deploy:[\s\S]*needs: build/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /name: github-pages/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test("Pages workflow does not deploy backend infrastructure", async () => {
  const workflow = await read(".github/workflows/deploy-pages.yml");
  assert.doesNotMatch(workflow, /supabase\s+(?:db|functions|migration|deploy)/i);
  assert.doesNotMatch(workflow, /api:start|build:api|docker|dns/i);
  assert.doesNotMatch(workflow, /SERVICE_ROLE|DATABASE_PASSWORD|JWT_SECRET/i);
});

test("release docs require the safe initial Pages cutover order", async () => {
  const paths = [
    "README.md",
    "docs/release-process.md",
    "docs/pages-deployment.md",
    "docs/release-checklist.md",
  ];
  const documents = await Promise.all(paths.map(read));

  for (const [index, document] of documents.entries()) {
    assert.match(document, /Initial Cutover \/ 首次迁移/, paths[index]);
    assert.match(document, /Do not merge the release-governance PR while Pages still publishes from the `main` branch/, paths[index]);
    assert.match(document, /Pages 发布源仍为 `main` 分支时，不要合并发布治理 PR/, paths[index]);
    assert.match(document, /(?:before (?:the )?(?:PR|pull request) merge|before merging)/i, paths[index]);
    assert.match(document, /only after the governance (?:PR|pull request) (?:is|has been) merged/i, paths[index]);
  }

  const checklist = documents[3];
  assert.match(checklist, /Phase 3 PR CI is green/);
  assert.match(checklist, /Environment allows only `main`/);
  assert.match(checklist, /`gh-pages` was removed/);
  assert.match(checklist, /Merging Phase 3 produced no automatic Pages deployment/);
});
