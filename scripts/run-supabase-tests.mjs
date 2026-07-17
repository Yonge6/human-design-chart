import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const dockerConfig = process.env.DOCKER_CONFIG || join(tmpdir(), "pluto-supabase-docker-config");
await mkdir(dockerConfig, { recursive: true });
await writeFile(join(dockerConfig, "config.json"), '{"auths":{}}\n', { flag: "wx" }).catch(() => {});

let stdout;
try {
  ({ stdout } = await execFileAsync("npx", ["supabase", "status", "-o", "env"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, DOCKER_CONFIG: dockerConfig },
  }));
} catch (error) {
  process.stderr.write("Local Supabase is required. Run `npx supabase start` first.\n");
  throw error;
}

const values = Object.fromEntries(stdout.split("\n").flatMap((line) => {
  const match = line.match(/^([A-Z_]+)="(.*)"$/);
  return match ? [[match[1], match[2]]] : [];
}));

const env = {
  ...process.env,
  DOCKER_CONFIG: dockerConfig,
  PLUTO_TEST_SUPABASE_URL: process.env.PLUTO_TEST_SUPABASE_URL || values.API_URL,
  PLUTO_TEST_SUPABASE_ANON_KEY: process.env.PLUTO_TEST_SUPABASE_ANON_KEY || values.ANON_KEY,
  PLUTO_TEST_SUPABASE_SERVICE_ROLE_KEY: process.env.PLUTO_TEST_SUPABASE_SERVICE_ROLE_KEY || values.SERVICE_ROLE_KEY,
};
for (const name of ["PLUTO_TEST_SUPABASE_URL", "PLUTO_TEST_SUPABASE_ANON_KEY", "PLUTO_TEST_SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[name]) throw new Error(`${name} is unavailable.`);
}

const child = await import("node:child_process").then(({ spawn }) => spawn(
  process.execPath,
  ["--test", "tests/supabase.integration.mjs"],
  { cwd: new URL("../", import.meta.url), env, stdio: "inherit" },
));
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
process.exitCode = Number(exitCode || 0);
