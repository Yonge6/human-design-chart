import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return paths.flat();
}

test("a real production-style build injects provenance but not server secrets", async () => {
  await execFileAsync(process.execPath, ["scripts/build-web.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      PLUTO_APP_VERSION: "1.0.0-test",
      PLUTO_GIT_COMMIT: "abc1234test",
      PLUTO_BUILD_DATE: "2026-07-18T00:00:00Z",
      PLUTO_ENVIRONMENT: "test",
      SUPABASE_SERVICE_ROLE_KEY: "must-never-enter-the-build",
    },
  });

  const runtime = await readFile(new URL("../dist/runtime-config.js", import.meta.url), "utf8");
  assert.match(runtime, /abc1234test/);
  assert.match(runtime, /1\.0\.0-test/);
  assert.doesNotMatch(runtime, /must-never-enter-the-build/);

  const files = await filesUnder(fileURLToPath(new URL("../dist/", import.meta.url)));
  for (const file of files) {
    const content = await readFile(file);
    assert.equal(content.includes(Buffer.from("must-never-enter-the-build")), false, file);
    assert.equal(content.includes(Buffer.from("SUPABASE_SERVICE_ROLE_KEY")), false, file);
  }
});

test("project metadata and root license identify AGPL-3.0-or-later", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  const license = await readFile(new URL("../LICENSE", import.meta.url), "utf8");

  assert.equal(packageJson.license, "AGPL-3.0-or-later");
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
});
