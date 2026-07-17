import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("CI gates engine, API, and real Supabase integration on pull requests and main", async () => {
  const workflow = await readFile(new URL("../.github/workflows/test.yml", import.meta.url), "utf8");
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /engine-web:[\s\S]*npm ci[\s\S]*npm test[\s\S]*npm run build/);
  assert.match(workflow, /api:[\s\S]*npm run test:api[\s\S]*npm run test:schema[\s\S]*npm run test:security[\s\S]*npm run build:api/);
  assert.match(workflow, /supabase:[\s\S]*supabase@\$\{PLUTO_SUPABASE_CLI_VERSION\} start[\s\S]*db reset[\s\S]*npm run test:supabase/);
  assert.match(workflow, /PLUTO_SUPABASE_CLI_VERSION: 2\.109\.1/);
  assert.match(workflow, /if: always\(\)[\s\S]*supabase@\$\{PLUTO_SUPABASE_CLI_VERSION\} stop --no-backup/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
