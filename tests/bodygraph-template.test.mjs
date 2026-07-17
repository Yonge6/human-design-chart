import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../assets/bodygraph-template.svg", import.meta.url), "utf8");

test("bodygraph contains nine distinct rounded centers", () => {
  const centerIds = ["head", "ajna", "throat", "g", "heart", "sacral", "splenic", "solar-plexus", "root"];
  for (const id of centerIds) assert.match(svg, new RegExp(`id="${id}-center"`));
  assert.equal((svg.match(/-center"/g) || []).length, 9);
  assert.ok((svg.match(/rx="11"/g) || []).length >= 3);
  assert.ok((svg.match(/ Q/g) || []).length >= 6);
});

test("bodygraph keeps all gates and dual activation tracks", () => {
  const gates = [...svg.matchAll(/data-gate-number="(\d+)"/g)].map((match) => Number(match[1]));
  assert.equal(gates.length, 64);
  assert.equal(new Set(gates).size, 64);
  assert.equal((svg.match(/data-gate-line=/g) || []).length, 144);
  assert.equal((svg.match(/data-gate-line-type="design"/g) || []).length, 72);
  assert.equal((svg.match(/data-gate-line-type="personality"/g) || []).length, 72);
});
