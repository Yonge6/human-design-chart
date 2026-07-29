import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("original BodyGraph provenance records the deterministic clean-room lineage", async () => {
  const provenance = await read("docs/bodygraph-original-visual-provenance.md");
  const normalized = provenance.replace(/\s+/g, " ");

  assert.match(provenance, /^# Original style-preserving BodyGraph provenance$/m);
  for (const heading of [
    "Scope",
    "Development lineage",
    "Files",
    "Deterministic generation",
    "Clean-room process",
    "Functional separation",
    "Verification",
  ]) {
    assert.match(provenance, new RegExp(`^## ${heading}$`, "m"));
  }

  assert.match(normalized, /2e055f9305e5369754b66b948a8feabd8f7fbcff/);
  assert.match(normalized, /c16eab03ab5e1404de15092181b9a7fc7e7776c7/);
  assert.match(normalized, /40ae09daeb8ffb33161602d747978be789516baa/);
  assert.match(normalized, /the commit containing this provenance record/);
  assert.match(normalized, /npm run generate:bodygraph/);
  assert.match(normalized, /1f937e8271853ec10af01c6d5d7ad959c637f32da1da4e8de475129c32a74c68/);
  assert.match(normalized, /360\s*(?:x|×)\s*620/i);
  assert.match(normalized, /9 centers/i);
  assert.match(normalized, /64 gates/i);
  assert.match(normalized, /36 channels/i);
  assert.match(normalized, /byte-for-byte/i);
  assert.match(normalized, /not an absolute legal guarantee/i);
  assert.match(normalized, /not legal advice/i);
  assert.match(normalized, /does not claim Apple approval/i);
});

test("provenance lists only the new visual implementation lineage", async () => {
  const provenance = await read("docs/bodygraph-original-visual-provenance.md");
  for (const path of [
    "docs/style-preserving-bodygraph-design-spec.md",
    "src/visualization/bodygraph-functional-topology.js",
    "src/visualization/bodygraph-original-geometry.js",
    "scripts/generate-original-bodygraph.mjs",
    "assets/bodygraph-original-template.svg",
    "src/renderer/bodygraph-renderer.js",
    "app.js",
  ]) {
    assert.match(provenance, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(provenance, /assets\/bodygraph-template\.svg/);
  assert.deepEqual(
    [...provenance.matchAll(/\b[a-f0-9]{64}\b/g)].map((match) => match[0]),
    ["1f937e8271853ec10af01c6d5d7ad959c637f32da1da4e8de475129c32a74c68"],
  );
});

test("runtime integration consumes the new SVG after calculation without entering compute contracts", async () => {
  const [app, renderer, topology, geometry, specification] = await Promise.all([
    read("app.js"),
    read("src/renderer/bodygraph-renderer.js"),
    read("src/visualization/bodygraph-functional-topology.js"),
    read("src/visualization/bodygraph-original-geometry.js"),
    read("docs/style-preserving-bodygraph-design-spec.md"),
  ]);

  assert.match(app, /templateUrl:\s*"\.\/assets\/bodygraph-original-template\.svg"/);
  assert.doesNotMatch(app, /templateUrl:\s*"\.\/assets\/bodygraph-template\.svg"/);
  assert.match(renderer, /createBodygraphRenderer/);
  assert.match(renderer, /data-channel-lane/);
  assert.match(renderer, /Defined Centers/);
  assert.doesNotMatch(`${renderer}\n${topology}\n${geometry}`, /calculateHumanDesign|createChartHash|profile-snapshot|schemas\//);
  assert.match(specification, /viewBox="0 0 360 620"/);
});
