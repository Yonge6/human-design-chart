import { spawn } from "node:child_process";

const root = new URL("../", import.meta.url);
const provided = [
  process.env.PLUTO_APP_VERSION,
  process.env.PLUTO_GIT_COMMIT,
  process.env.PLUTO_BUILD_DATE,
  process.env.PLUTO_ENVIRONMENT,
].every(Boolean);
const env = provided ? process.env : {
  ...process.env,
  PLUTO_APP_VERSION: "1.0.0-pages-test",
  PLUTO_GIT_COMMIT: "0123456789abcdef0123456789abcdef01234567",
  PLUTO_BUILD_DATE: "2026-07-18T00:00:00Z",
  PLUTO_ENVIRONMENT: "production",
};

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${args.join(" ")} failed with ${signal || `exit code ${code}`}`));
    });
  });
}

await run(["--test", "tests/pages-deployment.test.mjs"]);
if (!provided) await run(["scripts/build-web.mjs"]);
await run(["scripts/verify-pages-build.mjs"]);
