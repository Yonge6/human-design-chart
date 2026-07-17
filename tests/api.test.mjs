import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createApiServer } from "../api/app.mjs";
import { calculateHumanDesign } from "../src/engine/human-design-engine.js";
import { createHumanDesignProfileSnapshot } from "../src/engine/profile-snapshot.js";

let api;
let baseUrl;

before(async () => {
  api = createApiServer({
    appVersion: "1.0.0-test",
    gitCommit: "testcommit",
    buildDate: "2026-07-18T00:00:00.000Z",
    rateLimit: 100,
    origins: ["https://human-design.wonderelian.com"],
  });
  const address = await api.listen({ port: 0 });
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => api.close());

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { response, body: await response.json() };
}

const validInput = {
  birthDate: "1990-01-01",
  birthTime: "12:00",
  timezone: "Asia/Shanghai",
  locationLabel: "Wuhan, China",
};

const post = (input, headers = {}) => request("/v1/charts", {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(input),
});

test("health and version routes expose versions without sensitive internals", async () => {
  const health = await request("/v1/health");
  const version = await request("/v1/version");

  assert.equal(health.response.status, 200);
  assert.deepEqual(health.body.data, { status: "ok" });
  assert.equal(version.body.data.schemaVersion, "1.0");
  assert.equal(version.body.data.engineVersion, "1.0.0");
  assert.equal(version.body.data.gitCommit, "testcommit");
  assert.doesNotMatch(JSON.stringify(health.body), /secret|path|stack/i);
});

test("chart API really uses the shared Swiss Ephemeris engine", async () => {
  const apiResult = await post(validInput);
  const result = await calculateHumanDesign({
    name: "A name excluded from the hash",
    location: validInput.locationLabel,
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    timezone: validInput.timezone,
    timeDisambiguation: "earlier",
  });
  const browserSnapshot = await createHumanDesignProfileSnapshot({
    input: validInput,
    result,
    generatedAt: apiResult.body.data.generatedAt,
  });

  assert.equal(apiResult.response.status, 200);
  assert.equal(apiResult.body.error, null);
  assert.deepEqual(apiResult.body.data, browserSnapshot);
  assert.equal(apiResult.body.data.meta.ephemeris, "Swiss Ephemeris");
  assert.equal(apiResult.body.data.meta.nodeType, "True Node");
  assert.equal(apiResult.body.data.meta.designSolarArc, 88);
});

test("browser and API snapshots match for another fixed birth fixture", async () => {
  const input = {
    birthDate: "1986-06-24",
    birthTime: "13:50",
    timezone: "Asia/Shanghai",
    locationLabel: "Xiangtan, Hunan, China",
  };
  const apiResult = await post(input);
  const result = await calculateHumanDesign({
    name: "Excluded",
    location: input.locationLabel,
    year: 1986,
    month: 6,
    day: 24,
    hour: 13,
    minute: 50,
    timezone: input.timezone,
    timeDisambiguation: "earlier",
  });
  const direct = await createHumanDesignProfileSnapshot({ input, result, generatedAt: apiResult.body.data.generatedAt });

  assert.equal(apiResult.response.status, 200);
  assert.deepEqual(apiResult.body.data, direct);
});

test("invalid dates, times, and zones use stable error codes", async () => {
  const cases = [
    [{ ...validInput, birthDate: "2025-02-30" }, 400, "INVALID_BIRTH_DATE"],
    [{ ...validInput, birthTime: "25:00" }, 400, "INVALID_BIRTH_TIME"],
    [{ ...validInput, timezone: "Mars/Olympus" }, 400, "INVALID_TIMEZONE"],
  ];
  for (const [input, status, code] of cases) {
    const result = await post(input);
    assert.equal(result.response.status, status);
    assert.equal(result.body.error.code, code);
    assert.equal(result.body.data, null);
    assert.doesNotMatch(JSON.stringify(result.body), /\bat\s+.+:\d+|stack/i);
  }
});

test("DST gaps and repeated times are explicit", async () => {
  const gap = await post({
    ...validInput,
    birthDate: "2024-03-10",
    birthTime: "02:30",
    timezone: "America/New_York",
  });
  const repeated = await post({
    ...validInput,
    birthDate: "2024-11-03",
    birthTime: "01:30",
    timezone: "America/New_York",
  });
  const resolved = await post({
    ...validInput,
    birthDate: "2024-11-03",
    birthTime: "01:30",
    timezone: "America/New_York",
    timeDisambiguation: "later",
  });

  assert.equal(gap.body.error.code, "NONEXISTENT_LOCAL_TIME");
  assert.equal(repeated.body.error.code, "AMBIGUOUS_LOCAL_TIME");
  assert.equal(resolved.response.status, 200);
});

test("large bodies and disallowed origins are rejected", async () => {
  const oversized = await request("/v1/charts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ padding: "x".repeat(17 * 1024) }),
  });
  const preflight = await fetch(`${baseUrl}/v1/charts`, {
    method: "OPTIONS",
    headers: { origin: "https://evil.example" },
  });

  assert.equal(oversized.response.status, 413);
  assert.equal(preflight.status, 403);
  assert.equal(preflight.headers.get("access-control-allow-origin"), null);
});

test("the API returns the documented rate-limit error", async () => {
  const limitedApi = createApiServer({ rateLimit: 1 });
  const address = await limitedApi.listen({ port: 0 });
  try {
    const endpoint = `http://127.0.0.1:${address.port}/v1/charts`;
    const options = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validInput) };
    assert.equal((await fetch(endpoint, options)).status, 200);
    const limited = await fetch(endpoint, options);
    const body = await limited.json();
    assert.equal(limited.status, 429);
    assert.equal(body.error.code, "RATE_LIMITED");
  } finally {
    await limitedApi.close();
  }
});
