import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createAssetFingerprint, rewriteAssetReferences } from "./asset-fingerprinting.mjs";

const root = resolve(import.meta.dirname, "..");
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
  "robots.txt",
  "sitemap.xml",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
];
const directories = ["assets", "vendor", "src", "shared", "schemas"];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return paths.flat();
}

export async function buildWeb({
  rootDirectory = root,
  outputDirectory = resolve(rootDirectory, "dist"),
  environment = process.env,
} = {}) {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  await Promise.all([
    ...files.map((file) => cp(resolve(rootDirectory, file), resolve(outputDirectory, file))),
    ...directories.map((directory) => cp(
      resolve(rootDirectory, directory),
      resolve(outputDirectory, directory),
      { recursive: true },
    )),
  ]);
  await mkdir(resolve(outputDirectory, "supabase/functions/_shared"), { recursive: true });
  for (const contract of ["human-design-profile-contract.js", "product-event-contract.js"]) {
    await cp(
      resolve(rootDirectory, "supabase/functions/_shared", contract),
      resolve(outputDirectory, "supabase/functions/_shared", contract),
    );
  }

  const packageJson = JSON.parse(await readFile(resolve(rootDirectory, "package.json"), "utf8"));
  const runtimeConfig = {
    supabaseUrl: environment.PLUTO_SUPABASE_URL || "",
    supabasePublishableKey: environment.PLUTO_SUPABASE_PUBLISHABLE_KEY || "",
    apiBaseUrl: environment.PLUTO_API_BASE_URL || "",
    appVersion: environment.PLUTO_APP_VERSION || packageJson.version || "development",
    gitCommit: environment.PLUTO_GIT_COMMIT || "development",
    buildDate: environment.PLUTO_BUILD_DATE || "development",
    environment: environment.PLUTO_ENVIRONMENT || "development",
  };
  await writeFile(
    resolve(outputDirectory, "runtime-config.js"),
    `globalThis.PLUTO_CONFIG = Object.freeze(${JSON.stringify(runtimeConfig, null, 2)});\n`,
  );

  const outputFiles = await filesUnder(outputDirectory);
  const fingerprintEntries = await Promise.all(outputFiles.map(async (path) => ({
    path: relative(outputDirectory, path).split("\\").join("/"),
    content: await readFile(path),
  })));
  const fingerprint = createAssetFingerprint(fingerprintEntries);

  await Promise.all(outputFiles.map(async (path) => {
    const relativePath = relative(outputDirectory, path).split("\\").join("/");
    if (!/\.(?:html?|css|m?js)$/i.test(relativePath)) return;
    const content = await readFile(path, "utf8");
    const rewritten = rewriteAssetReferences(content, relativePath, fingerprint);
    if (rewritten !== content) await writeFile(path, rewritten);
  }));

  console.log(`Built native web bundle in ${outputDirectory} (asset fingerprint ${fingerprint})`);
  return { fingerprint, outputDirectory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildWeb();
}
