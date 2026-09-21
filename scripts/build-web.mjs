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
  "buer.css",
  "app.js",
  "analytics.js",
  "analytics-frame.html",
  "analytics-frame.js",
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
  native = false,
} = {}) {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  await Promise.all([
    ...files.map((file) => cp(resolve(rootDirectory, file), resolve(outputDirectory, file))),
    ...directories.map((directory) => cp(
      resolve(rootDirectory, directory),
      resolve(outputDirectory, directory),
      {
        recursive: true,
        filter: (path) => {
          const name = relative(rootDirectory, path).split("\\").join("/");
          if (name === "assets/bodygraph-original-template.svg" || name.startsWith("src/visualization") || name.endsWith("bodygraph-original-renderer.js")) return false;
          if (native && (name === "assets/bodygraph-template.svg" || name.startsWith("vendor/html2canvas"))) return false;
          return true;
        },
      },
    )),
  ]);
  if (native) {
    await cp(resolve(rootDirectory, "src/app/native-bodygraph.js"), resolve(outputDirectory, "src/renderer/bodygraph-renderer.js"));
    const appPath = resolve(outputDirectory, "app.js");
    const app = await readFile(appPath, "utf8");
    await writeFile(appPath, app.replace(/templateUrl: "\.\/assets\/bodygraph-template\.svg",/, ""));
    const htmlPath = resolve(outputDirectory, "index.html");
    await writeFile(htmlPath, (await readFile(htmlPath, "utf8"))
      .replace(/<script src="vendor\/html2canvas\/html2canvas\.min\.js"><\/script>/, "")
      .replace('<html lang="zh-CN">', '<html lang="zh-CN" class="native-text-results">'));
  }
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
    buerChatEnabled: environment.BUER_CHAT_ENABLED !== "false",
    buerPublicUrl: environment.BUER_PUBLIC_URL || "",
    buerShareQrPath: environment.BUER_SHARE_QR_PATH || "",
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

  console.log(`Built ${native ? "native" : "H5"} bundle in ${outputDirectory} (asset fingerprint ${fingerprint})`);
  return { fingerprint, outputDirectory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const native = process.argv.includes("--native");
  await buildWeb({ native, outputDirectory: resolve(root, native ? "dist-native" : "dist") });
}
