import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../assets/bodygraph-template.svg", import.meta.url), "utf8");

test("bodygraph restores the nine rounded historical centers", () => {
  const centerIds = ["head", "ajna", "throat", "g", "heart", "sacral", "splenic", "solar-plexus", "root"];
  for (const id of centerIds) assert.match(svg, new RegExp(`id="${id}-center"`));
  assert.equal((svg.match(/-center"/g) || []).length, 9);
  assert.match(svg, /id="g-center"[\s\S]*?x="172" y="361\.706263" width="83" height="83" rx="10"/);
  assert.match(svg, /id="throat-center"[\s\S]*?x="172" y="246\.706263" width="83" height="83" rx="10"/);
  assert.match(svg, /id="root-center"[\s\S]*?x="172" y="620\.706263" width="83" height="83" rx="10"/);
});

test("bodygraph restores all 64 capsule gate labels and dual activation tracks", () => {
  const gates = [...svg.matchAll(/data-gate-number="(\d+)"/g)].map((match) => Number(match[1]));
  assert.equal(gates.length, 65);
  assert.equal(new Set(gates).size, 64);
  assert.equal(gates.filter((gate) => gate === 37).length, 2);
  assert.equal((svg.match(/width="(?:16|18)" height="15" rx="7\.5"/g) || []).length, 65);
  assert.equal((svg.match(/data-gate-line=/g) || []).length, 128);
  assert.equal((svg.match(/data-gate-line-type="design"/g) || []).length, 64);
  assert.equal((svg.match(/data-gate-line-type="personality"/g) || []).length, 64);
});

test("gate capsules stay fully inside the 422 by 813 canvas", () => {
  const markers = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="(16|18)" height="15" rx="7\.5"/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]), width: Number(match[3]) }));
  assert.equal(markers.length, 65);
  for (const { x, y, width } of markers) {
    assert.ok(x >= 0 && x + width <= 422, `gate capsule at x ${x} stays inside the viewBox`);
    assert.ok(y >= 0 && y + 15 <= 813, `gate capsule at y ${y} stays inside the viewBox`);
  }
});

test("BodyGraph geometry stays outside the engine, API, and snapshot protocol", async () => {
  const sources = await Promise.all([
    "../src/engine/human-design-engine.js",
    "../src/engine/profile-snapshot.js",
    "../src/engine/chart-hash.js",
    "../api/app.mjs",
    "../schemas/human-design-profile-v1.schema.json",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  for (const source of sources) {
    assert.doesNotMatch(source, /bodygraph-template|<path\b|renderer\/bodygraph/i);
  }
  const renderer = await readFile(new URL("../src/renderer/bodygraph-renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /templateUrl/);
  assert.match(renderer, /fetch\(templateUrl\)/);
});
