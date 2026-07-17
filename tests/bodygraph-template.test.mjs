import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../assets/bodygraph-template.svg", import.meta.url), "utf8");

test("bodygraph contains nine distinct regular centers", () => {
  const centerIds = ["head", "ajna", "throat", "g", "heart", "sacral", "splenic", "solar-plexus", "root"];
  for (const id of centerIds) assert.match(svg, new RegExp(`id="${id}-center"`));
  assert.equal((svg.match(/-center"/g) || []).length, 9);
  assert.match(svg, /id="head-center" d="M211 28 151 129H271Z"/);
  assert.match(svg, /id="ajna-center" d="M151 151H271L211 243Z"/);
  assert.match(svg, /id="g-center" d="M211 397 290 475 211 553 132 475Z"/);
  assert.match(svg, /id="splenic-center" d="M44 503 137 457 137 648 44 602Z"/);
  assert.match(svg, /id="solar-plexus-center" d="M378 503 285 457 285 648 378 602Z"/);
  assert.ok((svg.match(/rx="1[23]"/g) || []).length >= 3);
});

test("bodygraph keeps all gates and dual activation tracks", () => {
  const gates = [...svg.matchAll(/data-gate-number="(\d+)"/g)].map((match) => Number(match[1]));
  assert.equal(gates.length, 64);
  assert.equal(new Set(gates).size, 64);
  assert.equal((svg.match(/data-gate-line=/g) || []).length, 144);
  assert.equal((svg.match(/data-gate-line-type="design"/g) || []).length, 72);
  assert.equal((svg.match(/data-gate-line-type="personality"/g) || []).length, 72);
});

test("gate labels stay inside the canvas and outer centers mirror around x 211", () => {
  const positions = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" data-gate-number="(\d+)"/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]), gate: Number(match[3]) }));
  assert.equal(positions.length, 64);
  for (const { x, y } of positions) {
    assert.ok(x >= 9 && x <= 413, `gate x ${x} remains inside the 422px viewBox`);
    assert.ok(y >= 9 && y <= 804, `gate y ${y} remains inside the 813px viewBox`);
  }
  const byGate = new Map(positions.map((position) => [position.gate, position]));
  for (const [leftGate, rightGate] of [[48, 36], [57, 22], [44, 37], [50, 6], [32, 49], [28, 55], [18, 30]]) {
    assert.equal(byGate.get(leftGate).x + byGate.get(rightGate).x, 422);
    assert.equal(byGate.get(leftGate).y, byGate.get(rightGate).y);
  }
});
