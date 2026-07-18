import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const expected = {
  appVersion: process.env.PLUTO_APP_VERSION,
  gitCommit: process.env.PLUTO_GIT_COMMIT,
  buildDate: process.env.PLUTO_BUILD_DATE,
  environment: process.env.PLUTO_ENVIRONMENT,
};

function fail(message) {
  throw new Error(`Pages build verification failed: ${message}`);
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return paths.flat();
}

for (const [name, value] of Object.entries(expected)) {
  if (!value || value === "development") fail(`${name} must be a non-development value`);
}
if (expected.environment !== "production") fail("PLUTO_ENVIRONMENT must be production");
if (!/^[0-9a-f]{40}$/.test(expected.gitCommit)) fail("PLUTO_GIT_COMMIT must be a full Git commit SHA");
if (Number.isNaN(Date.parse(expected.buildDate))) fail("PLUTO_BUILD_DATE must be an ISO timestamp");

await stat(dist).catch(() => fail("dist does not exist"));
const requiredFiles = [
  "index.html",
  "runtime-config.js",
  "robots.txt",
  "sitemap.xml",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "assets/pluto-og-1200x630.png",
];
for (const file of requiredFiles) {
  await stat(resolve(dist, file)).catch(() => fail(`missing ${file}`));
}

const runtime = await readFile(resolve(dist, "runtime-config.js"), "utf8");
for (const value of Object.values(expected)) {
  if (!runtime.includes(JSON.stringify(value))) fail(`runtime config is missing ${value}`);
}
if (/development/.test(runtime)) fail("runtime config still contains a development value");

const index = await readFile(resolve(dist, "index.html"), "utf8");
if (!index.includes("https://github.com/Yonge6/human-design-chart")) fail("source link is missing");
if (!index.includes("AGPL-3.0-or-later")) fail("AGPL license link is missing");

const files = await filesUnder(dist);
const forbiddenPaths = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)review\//i,
  /\.patch$/i,
  /(^|\/)ios\//i,
  /(^|\/)tests?\//i,
  /(^|\/)(?:Dockerfile|docker\/)/i,
];
const forbiddenContent = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /service_role/i,
  /DATABASE_PASSWORD/i,
  /(?:SUPABASE_)?JWT_SECRET/i,
  /postgres(?:ql)?:\/\//i,
  /gh[opsu]_[A-Za-z0-9_]{20,}/,
];

for (const file of files) {
  const name = relative(dist, file);
  if (forbiddenPaths.some((pattern) => pattern.test(name))) fail(`forbidden artifact path ${name}`);
  const content = await readFile(file);
  const text = content.toString("utf8");
  if (forbiddenContent.some((pattern) => pattern.test(text))) fail(`forbidden secret marker in ${name}`);
}

console.log(`Verified Pages artifact for ${expected.gitCommit} (${files.length} files).`);
