import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { HUMAN_DESIGN_CHANNELS } from "../supabase/functions/_shared/human-design-profile-contract.js";
import {
  BODYGRAPH_CHANNELS,
  BODYGRAPH_GATE_TO_CENTER,
} from "../src/visualization/bodygraph-functional-topology.js";

function extractArrayDeclaration(source, name) {
  const declaration = new RegExp(`\\bconst\\s+${name}\\s*=\\s*\\[`).exec(source);
  assert.ok(declaration, `Found authoritative ${name} declaration`);
  const start = source.indexOf("[", declaration.index);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "[") depth += 1;
    if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(`(${source.slice(start, index + 1)})`, Object.create(null), {
          timeout: 1000,
        });
      }
    }
  }

  assert.fail(`Could not parse authoritative ${name} declaration`);
}

const channelKey = (pair) => [...pair].sort((left, right) => left - right).join("-");

function normalizedChannelKeys(pairs, label) {
  assert.equal(pairs.length, 36, `${label} contains 36 channels`);
  const keys = pairs.map((pair) => {
    assert.equal(pair.length, 2, `${label} channel has two gates`);
    assert.ok(pair.every((gate) => Number.isInteger(gate) && gate >= 1 && gate <= 64));
    assert.notEqual(pair[0], pair[1], `${label} channel endpoints differ`);
    return channelKey(pair);
  });
  assert.equal(new Set(keys).size, 36, `${label} has no duplicate channels`);
  return [...keys].sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
}

test("visual topology matches engine and Schema authoritative channel data", async () => {
  const engineSource = await readFile(
    new URL("../src/engine/human-design-engine.js", import.meta.url),
    "utf8",
  );
  const engineRows = extractArrayDeclaration(engineSource, "CHANNELS");
  const engineChannels = engineRows.map(([gates]) => gates);
  const visualChannels = BODYGRAPH_CHANNELS.map(({ gates }) => gates);

  const engineKeys = normalizedChannelKeys(engineChannels, "engine");
  const schemaKeys = normalizedChannelKeys(HUMAN_DESIGN_CHANNELS, "Schema");
  const visualKeys = normalizedChannelKeys(visualChannels, "BodyGraph");

  assert.deepEqual(visualKeys, engineKeys);
  assert.deepEqual(visualKeys, schemaKeys);
});

test("visual gate ownership matches the engine's nonvisual channel ownership", async () => {
  const engineSource = await readFile(
    new URL("../src/engine/human-design-engine.js", import.meta.url),
    "utf8",
  );
  const engineRows = extractArrayDeclaration(engineSource, "CHANNELS");
  const engineGateToCenter = new Map();

  for (const [gates, centers] of engineRows) {
    assert.equal(gates.length, 2);
    assert.equal(centers.length, 2);
    for (let index = 0; index < 2; index += 1) {
      const existing = engineGateToCenter.get(gates[index]);
      assert.ok(!existing || existing === centers[index], `Engine ownership for Gate ${gates[index]} is consistent`);
      engineGateToCenter.set(gates[index], centers[index]);
    }
  }

  assert.equal(engineGateToCenter.size, 64);
  assert.equal(Object.keys(BODYGRAPH_GATE_TO_CENTER).length, 64);

  const normalizeVisualCenter = (center) => center === "solar-plexus" ? "solar" : center;
  for (let gate = 1; gate <= 64; gate += 1) {
    assert.equal(
      normalizeVisualCenter(BODYGRAPH_GATE_TO_CENTER[gate]),
      engineGateToCenter.get(gate),
      `Gate ${gate} center ownership`,
    );
  }
});
