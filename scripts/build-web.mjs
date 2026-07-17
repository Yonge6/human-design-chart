import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const files = [
  "index.html",
  "privacy.html",
  "support.html",
  "legal.html",
  "legal.css",
  "style.css",
  "app.js",
  "build-provenance.js",
  "human-design-engine.js",
  "location-service.js",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
];
const directories = ["assets", "vendor", "src", "shared", "schemas"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all([
  ...files.map((file) => cp(resolve(root, file), resolve(output, file))),
  ...directories.map((directory) => cp(
    resolve(root, directory),
    resolve(output, directory),
    { recursive: true },
  )),
]);
await mkdir(resolve(output, "supabase/functions/_shared"), { recursive: true });
for (const contract of ["human-design-profile-contract.js", "product-event-contract.js"]) {
  await cp(resolve(root, "supabase/functions/_shared", contract), resolve(output, "supabase/functions/_shared", contract));
}

const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const runtimeConfig = {
  supabaseUrl: process.env.PLUTO_SUPABASE_URL || "",
  supabasePublishableKey: process.env.PLUTO_SUPABASE_PUBLISHABLE_KEY || "",
  apiBaseUrl: process.env.PLUTO_API_BASE_URL || "",
  appVersion: process.env.PLUTO_APP_VERSION || packageJson.version || "development",
  gitCommit: process.env.PLUTO_GIT_COMMIT || "development",
  buildDate: process.env.PLUTO_BUILD_DATE || "development",
  environment: process.env.PLUTO_ENVIRONMENT || "development",
};
await writeFile(
  resolve(output, "runtime-config.js"),
  `globalThis.PLUTO_CONFIG = Object.freeze(${JSON.stringify(runtimeConfig, null, 2)});\n`,
);

console.log(`Built native web bundle in ${output}`);
