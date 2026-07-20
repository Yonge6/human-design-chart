import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";

import {
  appendAssetFingerprint,
  ASSET_FINGERPRINT_PATTERN,
  createAssetFingerprint,
  DATE_CACHE_VERSION_PATTERN,
  rewriteAssetReferences,
} from "../scripts/asset-fingerprinting.mjs";
import { buildWeb } from "../scripts/build-web.mjs";

const root = resolve(import.meta.dirname, "..");
const fixedEnvironment = {
  PLUTO_APP_VERSION: "1.1.0-fingerprint-test",
  PLUTO_GIT_COMMIT: "0123456789abcdef0123456789abcdef01234567",
  PLUTO_BUILD_DATE: "2026-07-20T00:00:00Z",
  PLUTO_ENVIRONMENT: "test",
};

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return paths.flat();
}

function fingerprintFrom(value) {
  return [...value.matchAll(/[?&]v=([a-f0-9]{16})(?=[&#"'`)\s]|$)/g)].map((match) => match[1]);
}

function localPath(reference) {
  return reference.split("#", 1)[0].split("?", 1)[0];
}

function extractReferences(content, relativePath) {
  const references = [];
  if (/\.html?$/i.test(relativePath)) {
    for (const match of content.matchAll(/<(?:script|img|source|video)\b[^>]*?\s(?:src|poster)=["']([^"']+)["']/gi)) references.push(match[1]);
    for (const match of content.matchAll(/<link\b[^>]*?\shref=["']([^"']+)["']/gi)) references.push(match[1]);
  } else if (/\.css$/i.test(relativePath)) {
    for (const match of content.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) references.push(match[1]);
  } else if (/\.(?:m?js)$/i.test(relativePath)) {
    for (const match of content.matchAll(/(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/g)) references.push(match[1]);
    for (const match of content.matchAll(/new\s+URL\(\s*["'`](\.{1,2}\/[^"'`]+)["'`]\s*,\s*import\.meta\.url/g)) references.push(match[1]);
    for (const match of content.matchAll(/templateUrl\s*:\s*["'](\.{1,2}\/[^"']+)["']/g)) references.push(match[1]);
  }
  return references;
}

test("SHA-256 asset fingerprints are stable, order-independent, and content-sensitive", () => {
  const fixtures = [
    { path: "app.js", content: "export const value = 1;" },
    { path: "style.css", content: "body { color: black; }" },
    { path: "assets/image.png", content: Buffer.from([1, 2, 3]) },
    { path: "vendor/library.js", content: "globalThis.vendor = 1;" },
    { path: "runtime-config.js", content: "globalThis.CONFIG = {};" },
  ];
  const first = createAssetFingerprint(fixtures);
  const reordered = createAssetFingerprint([...fixtures].reverse());

  assert.match(first, ASSET_FINGERPRINT_PATTERN);
  assert.equal(reordered, first);
  for (const [index, fixture] of fixtures.entries()) {
    const changed = fixtures.map((entry, fixtureIndex) => (
      fixtureIndex === index
        ? { ...entry, content: Buffer.concat([Buffer.from(entry.content), Buffer.from("changed")]) }
        : entry
    ));
    assert.notEqual(createAssetFingerprint(changed), first, `${fixture.path} must affect the fingerprint`);
  }
});

test("all active Web build inputs are free of date-shaped cache versions", async () => {
  const paths = [
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
    ...await filesUnder(resolve(root, "vendor")),
    ...await filesUnder(resolve(root, "src")),
    ...await filesUnder(resolve(root, "shared")),
    ...await filesUnder(resolve(root, "supabase/functions/_shared")),
  ];
  for (const path of paths) {
    const absolutePath = path.startsWith(root) ? path : resolve(root, path);
    if (!/\.(?:html?|css|m?js|ts)$/i.test(absolutePath)) continue;
    const content = await readFile(absolutePath, "utf8");
    assert.equal(DATE_CACHE_VERSION_PATTERN.test(content), false, relative(root, absolutePath));
  }
});

test("rewriting preserves queries and fragments while excluding non-local URLs", () => {
  const fingerprint = "0123456789abcdef";
  assert.equal(appendAssetFingerprint("assets/a.png?size=2#hero", fingerprint), "assets/a.png?size=2&v=0123456789abcdef#hero");
  for (const reference of [
    "https://example.com/a.js?x=1#top",
    "data:image/png;base64,AA==",
    "blob:https://example.com/id",
    "mailto:hello@example.com",
    "#results",
    "//cdn.example.com/a.js",
  ]) {
    assert.equal(appendAssetFingerprint(reference, fingerprint), reference);
  }

  const html = rewriteAssetReferences(
    '<link rel="canonical" href="https://example.com/"><script src="app.js"></script><img src="data:image/png;base64,AA==">',
    "index.html",
    fingerprint,
  );
  assert.match(html, /https:\/\/example\.com\//);
  assert.match(html, /src="app\.js\?v=0123456789abcdef"/);
  assert.match(html, /src="data:image\/png;base64,AA=="/);
});

test("two builds with identical inputs and environment produce the same fingerprint", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "pluto-fingerprint-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const firstOutput = join(temporaryRoot, "first");
  const secondOutput = join(temporaryRoot, "second");

  const first = await buildWeb({ rootDirectory: root, outputDirectory: firstOutput, environment: fixedEnvironment });
  const second = await buildWeb({ rootDirectory: root, outputDirectory: secondOutput, environment: fixedEnvironment });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(
    await readFile(join(firstOutput, "index.html"), "utf8"),
    await readFile(join(secondOutput, "index.html"), "utf8"),
  );
});

test("built resources use one valid fingerprint and resolve without broken local paths", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "pluto-assets-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const output = join(temporaryRoot, "dist");
  const { fingerprint } = await buildWeb({ rootDirectory: root, outputDirectory: output, environment: fixedEnvironment });
  const paths = await filesUnder(output);
  const discoveredFingerprints = new Set();
  const checked = [];

  for (const path of paths) {
    const relativePath = relative(output, path).split("\\").join("/");
    if (!/\.(?:html?|css|m?js)$/i.test(relativePath)) continue;
    const content = await readFile(path, "utf8");
    for (const value of fingerprintFrom(content)) discoveredFingerprints.add(value);
    for (const reference of extractReferences(content, relativePath)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) continue;
      assert.match(reference, new RegExp(`[?&]v=${fingerprint}(?:[&#]|$)`), `${relativePath}: ${reference}`);
      const clean = localPath(reference);
      if (clean.includes("${")) {
        const prefix = clean.slice(0, clean.indexOf("${"));
        await stat(resolve(dirname(path), prefix));
      } else {
        const target = clean.startsWith("/") ? resolve(output, clean.slice(1)) : resolve(dirname(path), clean);
        await stat(target);
      }
      checked.push(`${relativePath}: ${reference}`);
    }
  }

  assert.deepEqual([...discoveredFingerprints], [fingerprint]);
  assert.ok(checked.length >= 35, `expected broad asset coverage, found ${checked.length}`);

  const index = await readFile(join(output, "index.html"), "utf8");
  const app = await readFile(join(output, "app.js"), "utf8");
  const profile = await readFile(join(output, "src/engine/profile-snapshot.js"), "utf8");
  const hash = await readFile(join(output, "src/engine/chart-hash.js"), "utf8");
  const contract = await readFile(join(output, "shared/human-design-profile-contract.js"), "utf8");
  for (const content of [index, app, profile, hash, contract]) {
    assert.match(content, new RegExp(`[?&]v=${fingerprint}(?:[&#"'])`));
  }
});
