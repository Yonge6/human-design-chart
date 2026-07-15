import assert from "node:assert/strict";
import test from "node:test";

import {
  GATE_ORDER,
  CHANNELS,
  getAuthority,
  getEnvironment,
  localToUtcCandidates,
  localToUtcMs,
  longitudeToActivation,
} from "../human-design-engine.js";

const iso = (...args) => new Date(localToUtcMs(...args)).toISOString();

test("normal and fractional-offset zones convert exactly", () => {
  assert.equal(iso(1990, 1, 1, 12, 0, "Asia/Shanghai"), "1990-01-01T04:00:00.000Z");
  assert.equal(iso(2024, 1, 1, 12, 0, "Asia/Kathmandu"), "2024-01-01T06:15:00.000Z");
  assert.equal(iso(2024, 1, 1, 12, 0, "Pacific/Chatham"), "2023-12-31T22:15:00.000Z");
});

test("daylight-saving gaps and skipped civil days are rejected", () => {
  assert.equal(localToUtcCandidates(2024, 3, 10, 2, 30, "America/New_York").length, 0);
  assert.equal(localToUtcCandidates(2024, 3, 31, 1, 30, "Europe/London").length, 0);
  assert.equal(localToUtcCandidates(2024, 10, 6, 2, 15, "Australia/Lord_Howe").length, 0);
  assert.equal(localToUtcCandidates(2011, 12, 30, 12, 0, "Pacific/Apia").length, 0);
  assert.throws(
    () => localToUtcMs(2024, 3, 10, 2, 30, "America/New_York"),
    /did not exist/,
  );
});

test("repeated clock times expose both instants and honor the selected occurrence", () => {
  const newYork = localToUtcCandidates(2024, 11, 3, 1, 30, "America/New_York");
  assert.deepEqual(newYork.map((value) => new Date(value).toISOString()), [
    "2024-11-03T05:30:00.000Z",
    "2024-11-03T06:30:00.000Z",
  ]);
  assert.equal(new Date(localToUtcMs(2024, 11, 3, 1, 30, "America/New_York", "later")).toISOString(), new Date(newYork[1]).toISOString());
  assert.equal(localToUtcCandidates(2024, 10, 27, 1, 30, "Europe/London").length, 2);
  assert.equal(localToUtcCandidates(2024, 4, 7, 1, 45, "Australia/Lord_Howe").length, 2);
});

test("invalid calendar dates are rejected instead of rolling forward", () => {
  assert.throws(() => localToUtcCandidates(2023, 2, 29, 12, 0, "Etc/UTC"), /Invalid/);
  assert.throws(() => localToUtcCandidates(2024, 4, 31, 12, 0, "Etc/UTC"), /Invalid/);
});

test("all 64 gate starts map to the canonical gate order", () => {
  assert.equal(GATE_ORDER.length, 64);
  GATE_ORDER.forEach((gate, index) => {
    const longitude = (358.25 + index * 5.625 + 1e-9) % 360;
    const activation = longitudeToActivation(longitude);
    assert.equal(activation.Gate, gate);
    assert.equal(activation.Line, 1);
  });
});

test("activation subdivisions and channel catalog stay in range", () => {
  for (let longitude = 0; longitude < 360; longitude += 0.1) {
    const activation = longitudeToActivation(longitude);
    assert.ok(GATE_ORDER.includes(activation.Gate));
    assert.ok(activation.Line >= 1 && activation.Line <= 6);
    assert.ok(activation.Color >= 1 && activation.Color <= 6);
    assert.ok(activation.Tone >= 1 && activation.Tone <= 6);
    assert.ok(activation.Base >= 1 && activation.Base <= 5);
  }
  assert.equal(CHANNELS.length, 36);
  assert.equal(new Set(CHANNELS.map(([[a, b]]) => `${Math.min(a, b)}-${Math.max(a, b)}`)).size, 36);
});

test("ego authority distinguishes manifested and projected configurations", () => {
  const centers = new Set(["heart", "throat"]);
  assert.equal(getAuthority(centers, [[[21, 45], ["heart", "throat"]]]), "Ego Manifested");
  assert.equal(getAuthority(new Set(["heart", "g"]), [[[25, 51], ["g", "heart"]]]), "Ego Projected");
});

test("shore environments preserve the node orientation", () => {
  assert.equal(getEnvironment(6, true), "Natural Shores");
  assert.equal(getEnvironment(6, false), "Artificial Shores");
  assert.equal(getEnvironment(4, false), "Mountains");
});
