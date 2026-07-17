import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
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
  const forbidden = {
    SUPABASE_SERVICE_ROLE_KEY: "must-never-enter-the-build",
    PLUTO_DATABASE_PASSWORD: "test-database-password-never-build",
    SUPABASE_JWT_SECRET: "test-jwt-secret-never-build",
  };
  await execFileAsync(process.execPath, ["scripts/build-web.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      PLUTO_APP_VERSION: "1.0.0-test",
      PLUTO_GIT_COMMIT: "abc1234test",
      PLUTO_BUILD_DATE: "2026-07-18T00:00:00Z",
      PLUTO_ENVIRONMENT: "test",
      ...forbidden,
    },
  });

  const runtime = await readFile(new URL("../dist/runtime-config.js", import.meta.url), "utf8");
  assert.match(runtime, /abc1234test/);
  assert.match(runtime, /1\.0\.0-test/);
  assert.match(runtime, /2026-07-18T00:00:00Z/);

  const files = await filesUnder(fileURLToPath(new URL("../dist/", import.meta.url)));
  for (const file of files) {
    const content = await readFile(file);
    for (const [name, value] of Object.entries(forbidden)) {
      assert.equal(content.includes(Buffer.from(value)), false, `${file}: ${name}`);
    }
  }
});

test("the API production package carries license notices and no injected secrets", async () => {
  await execFileAsync(process.execPath, ["scripts/build-api-package.mjs"], {
    cwd: root,
    env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: "api-secret-no", SUPABASE_JWT_SECRET: "api-jwt-no", DATABASE_PASSWORD: "api-db-no" },
  });
  const output = fileURLToPath(new URL("../dist-api/", import.meta.url));
  const files = await filesUnder(output);
  const names = files.map((file) => relative(output, file));
  assert.ok(names.includes("LICENSE"));
  assert.ok(names.includes("THIRD_PARTY_NOTICES.md"));
  assert.ok(names.includes("api/server.mjs"));
  for (const file of files) {
    const content = await readFile(file);
    for (const secret of ["api-secret-no", "api-jwt-no", "api-db-no"]) assert.equal(content.includes(Buffer.from(secret)), false, file);
  }
});

test("project metadata and root license identify AGPL-3.0-or-later", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  const license = await readFile(new URL("../LICENSE", import.meta.url), "utf8");

  assert.equal(packageJson.license, "AGPL-3.0-or-later");
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
});
