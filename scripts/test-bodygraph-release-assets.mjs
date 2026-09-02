import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const newAssetName = "bodygraph-original-template.svg";
const historicalAssetName = "bodygraph-template.svg";
const expectedSha = "c89584a9e64032c87efa0086bf2bc014cc34921301c938c4bb056476dd494983";
const runtimeTextExtensions = new Set([".css", ".html", ".htm", ".js", ".json", ".mjs", ".xml"]);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function requireFile(path, label) {
  assert.equal(await exists(path), true, `${label} exists: ${path}`);
  return readFile(path);
}

async function requireMissing(path, label) {
  assert.equal(await exists(path), false, `${label} is absent: ${path}`);
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return children.flat();
}

async function assertNoHistoricalRuntimeReference(directory, label) {
  const files = (await filesUnder(directory))
    .filter((path) => runtimeTextExtensions.has(extname(path).toLowerCase()));
  for (const path of files) {
    const source = await readFile(path, "utf8");
    assert.equal(
      source.includes(historicalAssetName),
      false,
      `${label} has no historical BodyGraph runtime reference: ${path}`,
    );
  }
}

const sourceAssets = resolve(root, "assets");
const distAssets = resolve(root, "dist", "assets");
const iosPublic = resolve(root, "ios", "App", "App", "public");
const iosAssets = resolve(iosPublic, "assets");
const sourceAssetPath = resolve(sourceAssets, newAssetName);
const distAssetPath = resolve(distAssets, newAssetName);
const iosAssetPath = resolve(iosAssets, newAssetName);

const [sourceAsset, distAsset, iosAsset] = await Promise.all([
  requireFile(sourceAssetPath, "source BodyGraph asset"),
  requireFile(distAssetPath, "dist BodyGraph asset"),
  requireFile(iosAssetPath, "iOS public BodyGraph asset"),
]);

await Promise.all([
  requireMissing(resolve(sourceAssets, historicalAssetName), "historical source asset"),
  requireMissing(resolve(distAssets, historicalAssetName), "historical dist asset"),
  requireMissing(resolve(iosAssets, historicalAssetName), "historical iOS public asset"),
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceSha = sha256(sourceAsset);
assert.equal(sourceSha, expectedSha, "source BodyGraph SHA remains reviewed");
assert.equal(sha256(distAsset), sourceSha, "dist BodyGraph SHA matches source");
assert.equal(sha256(iosAsset), sourceSha, "iOS public BodyGraph SHA matches source");

const appSource = await readFile(resolve(root, "app.js"), "utf8");
assert.equal(
  appSource.match(new RegExp(newAssetName.replaceAll(".", "\\."), "g"))?.length,
  1,
  "app.js references the proposed BodyGraph asset exactly once",
);
assert.equal(appSource.includes(historicalAssetName), false, "app.js has no historical asset reference");

await Promise.all([
  assertNoHistoricalRuntimeReference(resolve(root, "dist"), "dist"),
  assertNoHistoricalRuntimeReference(iosPublic, "iOS public"),
]);

console.log(`BodyGraph release assets verified at SHA-256 ${sourceSha}`);
