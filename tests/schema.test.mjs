import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import { createChartHash } from "../src/engine/chart-hash.js";
import { calculateHumanDesign } from "../src/engine/human-design-engine.js";
import { createHumanDesignProfileSnapshot } from "../src/engine/profile-snapshot.js";
import { PROFILE_VERIFICATION, validateHumanDesignProfileSnapshot } from "../shared/human-design-profile-contract.js";
import { installNodeFileFetch } from "../api/node-file-fetch.mjs";

installNodeFileFetch();

async function exampleSnapshot(overrides = {}) {
  const input = {
    birthDate: "1990-01-01",
    birthTime: "12:00",
    timezone: "Asia/Shanghai",
    locationLabel: "Wuhan, China",
    ...overrides,
  };
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.birthTime.split(":").map(Number);
  const result = await calculateHumanDesign({
    name: "Schema fixture name",
    location: input.locationLabel,
    year,
    month,
    day,
    hour,
    minute,
    timezone: input.timezone,
    timeDisambiguation: "earlier",
  });
  return createHumanDesignProfileSnapshot({ input, result, generatedAt: "2026-07-18T00:00:00.000Z" });
}

test("a real Swiss Ephemeris snapshot passes the version 1 schema", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/human-design-profile-v1.schema.json", import.meta.url)));
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  const snapshot = await exampleSnapshot();

  assert.equal(validate(snapshot), true, JSON.stringify(validate.errors));
  assert.equal(snapshot.schemaVersion, "1.0");
  assert.equal(snapshot.engineVersion, "1.0.0");
  assert.equal(snapshot.verificationStatus, "client_asserted");
  assert.equal(snapshot.meta.ephemeris, "Swiss Ephemeris");
  assert.equal(snapshot.meta.nodeType, "True Node");
  assert.equal(snapshot.meta.designSolarArc, 88);
});

test("chart hash is stable across names, generated times, labels, and key order", async () => {
  const snapshot = await exampleSnapshot();
  const reverseKeys = (value) => {
    if (Array.isArray(value)) return value.map(reverseKeys);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)]));
  };
  const reordered = reverseKeys(snapshot);
  const changedPresentation = {
    ...snapshot,
    name: "A display-only name",
    language: "zh",
    verificationStatus: PROFILE_VERIFICATION.ENGINE_VERIFIED,
    generatedAt: "2030-01-01T00:00:00.000Z",
    input: { ...snapshot.input, name: "Another display-only name", locationLabel: "武汉" },
  };

  assert.equal(await createChartHash(changedPresentation), snapshot.chartHash);
  assert.equal(await createChartHash(reordered), snapshot.chartHash);
  assert.equal("name" in snapshot.input, false);
});

test("the HTTP SHA-256 fallback matches Web Crypto for a real chart snapshot", async () => {
  const snapshot = await exampleSnapshot();
  const expected = await createChartHash(snapshot);
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");

  try {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    assert.equal(await createChartHash(snapshot), expected);
  } finally {
    if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    else delete globalThis.crypto;
  }
});

test("the shared contract rejects invalid ranges, enums, channels, centers, and variables", async () => {
  const snapshot = await exampleSnapshot();
  const mutations = [
    (value) => { value.activations.personality.sun.gate = 65; },
    (value) => { value.activations.personality.sun.line = 0; },
    (value) => { value.activations.personality.sun.color = 7; },
    (value) => { value.activations.personality.sun.tone = 7; },
    (value) => { value.activations.personality.sun.base = 6; },
    (value) => { value.activations.personality.sun.longitude = 360; },
    (value) => { value.core.type = "Architect"; },
    (value) => { value.core.authority = "Arbitrary"; },
    (value) => { value.core.profile = "1/1"; },
    (value) => { value.core.definition = "Loose Definition"; },
    (value) => { value.structure.channels = [[1, 2]]; },
    (value) => { value.structure.definedCenters = ["brain"]; },
    (value) => { value.structure.variables.digestion = "left"; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(snapshot);
    mutate(changed);
    assert.equal(validateHumanDesignProfileSnapshot(changed).valid, false);
  }
});

test("real chart identity includes schema, engine, and calculation output", async () => {
  const snapshot = await exampleSnapshot();
  assert.notEqual(await createChartHash({ ...snapshot, schemaVersion: "1.1" }), snapshot.chartHash);
  assert.notEqual(await createChartHash({ ...snapshot, engineVersion: "1.0.1" }), snapshot.chartHash);
  assert.notEqual(await createChartHash({
    ...snapshot,
    core: { ...snapshot.core, authority: "Changed calculation output" },
  }), snapshot.chartHash);
});

test("core calculation fixture remains unchanged after module separation", async () => {
  const snapshot = await exampleSnapshot();

  assert.deepEqual(snapshot.core, {
    type: "Generator",
    strategy: "To Respond",
    authority: "Emotional - Solar Plexus",
    profile: "2/4",
    definition: "Single Definition",
    incarnationCross: "Right Angle Cross of Tension (38/39 | 48/21)",
  });
  assert.deepEqual(snapshot.structure.channels, [[9, 52], [30, 41]]);
  assert.deepEqual(snapshot.structure.definedCenters, ["sacral", "root", "solar plexus"]);
  assert.deepEqual(snapshot.activations.personality.sun, {
    gate: 38,
    line: 2,
    color: 1,
    tone: 2,
    base: 3,
    longitude: 280.4744321563944,
  });
  assert.deepEqual(snapshot.activations.design.sun, {
    gate: 48,
    line: 4,
    color: 2,
    tone: 1,
    base: 2,
    longitude: 192.47443215683552,
  });
});

test("an incompatible schema version is rejected", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/human-design-profile-v1.schema.json", import.meta.url)));
  const validate = new Ajv2020().compile(schema);
  const snapshot = await exampleSnapshot();

  snapshot.schemaVersion = "2.0";
  assert.equal(validate(snapshot), false);
});
