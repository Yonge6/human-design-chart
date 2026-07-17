import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONSENT,
  recordProductEvent,
  sanitizeProductEvent,
  saveChartToCloud,
} from "../src/services/backend-service.js";

test("cloud saving and product analytics are off by default", async () => {
  assert.deepEqual(DEFAULT_CONSENT, { cloudSave: false, productAnalytics: false });
  assert.deepEqual(await saveChartToCloud({ chartHash: "sensitive" }, { name: "Private" }), { skipped: true });
  assert.deepEqual(await recordProductEvent("app_open", {}), { skipped: true });
});

test("anonymous events reject personal and chart data", () => {
  for (const field of ["name", "birthDate", "birthTime", "locationLabel", "latitude", "snapshot", "userAgent", "stack"]) {
    assert.throws(() => sanitizeProductEvent("app_open", { [field]: "private" }), /UNSUPPORTED_EVENT_FIELD/);
  }
  assert.deepEqual(sanitizeProductEvent("language_changed", { language: "zh" }), {
    eventName: "language_changed",
    properties: { language: "zh" },
  });
  assert.throws(() => sanitizeProductEvent("arbitrary_event", {}), /INVALID_EVENT_NAME/);
  assert.throws(() => sanitizeProductEvent("app_open", { safeLooking: { name: "nested" } }), /UNSUPPORTED_EVENT_FIELD/);
  assert.throws(() => sanitizeProductEvent("app_open", { platform: "张三，1990年1月1日出生于武汉" }), /INVALID_EVENT_VALUE/);
  assert.throws(() => sanitizeProductEvent("app_open", { category: "任意自由文本" }), /INVALID_EVENT_VALUE/);
  assert.throws(() => sanitizeProductEvent("app_open", { schemaVersion: "x".repeat(65) }), /INVALID_EVENT_VALUE/);
  assert.deepEqual(sanitizeProductEvent("share_completed", {
    language: "en", environment: "production", platform: "ios", surface: "detail", format: "native_share",
  }).properties, {
    language: "en", environment: "production", platform: "ios", surface: "detail", format: "native_share",
  });
});

test("database migration enables RLS and owner-only chart access", async () => {
  const migration = await import("node:fs/promises").then(async ({ readFile }) => `${await readFile(
    new URL("../supabase/migrations/202607180001_open_source_backend.sql", import.meta.url), "utf8",
  )}\n${await readFile(new URL("../supabase/migrations/202607180002_cloud_integrity.sql", import.meta.url), "utf8")}`);
  for (const table of ["app_users", "consent_records", "chart_records", "product_events", "admin_users", "admin_audit_logs"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /users read own charts[\s\S]+user_id = auth\.uid\(\)/i);
  assert.doesNotMatch(migration, /create policy [^;]+product_events for select[^;]+auth\.uid/i);
  assert.match(migration, /revoke insert, update on public\.chart_records from authenticated/i);
  assert.match(migration, /revoke insert on public\.product_events from authenticated/i);
  assert.match(migration, /verification_status[\s\S]+client_asserted[\s\S]+engine_verified/i);
});

test("all write Edge Functions share JWT, CORS, size, and allowlist guards", async () => {
  const { readFile } = await import("node:fs/promises");
  const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
  for (const name of ["save-chart", "record-event", "update-consent", "delete-cloud-data"]) {
    const source = await readFile(new URL(`../supabase/functions/${name}/index.ts`, import.meta.url), "utf8");
    assert.match(config, new RegExp(`functions\\.${name.replace("-", "\\-")}\\][\\s\\S]*?verify_jwt = true`));
    assert.match(source, /authenticatedClients\(request\)/);
    assert.match(source, /originAllowed\(request\)/);
    assert.match(source, /limitedJson\(request,/);
    assert.doesNotMatch(source, /console\.(?:log|info|warn|error)|request\.text\(\)/);
  }
});
