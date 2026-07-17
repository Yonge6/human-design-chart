import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test, { after, before } from "node:test";
import { promisify } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { calculateHumanDesign } from "../src/engine/human-design-engine.js";
import { createHumanDesignProfileSnapshot } from "../src/engine/profile-snapshot.js";
import { createChartHash, PROFILE_VERIFICATION } from "../shared/human-design-profile-contract.js";
import { installNodeFileFetch } from "../api/node-file-fetch.mjs";

installNodeFileFetch();
const execFileAsync = promisify(execFile);

const url = process.env.PLUTO_TEST_SUPABASE_URL;
const anonKey = process.env.PLUTO_TEST_SUPABASE_ANON_KEY;
const serviceKey = process.env.PLUTO_TEST_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Local Supabase test configuration is required.");

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceKey, clientOptions);
let a;
let b;
let userA;
let userB;
let tokenA;
let tokenB;
let snapshotA;
let snapshotA2;
let snapshotB;

async function anonymousClient() {
  const client = createClient(url, anonKey, clientOptions);
  const { data, error } = await client.auth.signInAnonymously();
  assert.ifError(error);
  assert.ok(data.user?.id);
  assert.ok(data.session?.access_token);
  return { client, user: data.user, token: data.session.access_token };
}

async function makeSnapshot(birthDate, birthTime, locationLabel) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);
  const input = { birthDate, birthTime, timezone: "Asia/Shanghai", locationLabel };
  const result = await calculateHumanDesign({
    name: "not included in snapshot",
    location: locationLabel,
    year, month, day, hour, minute,
    timezone: input.timezone,
    timeDisambiguation: "earlier",
  });
  return createHumanDesignProfileSnapshot({ input, result, generatedAt: "2026-07-18T00:00:00.000Z" });
}

async function invoke(name, token, body, { origin = "http://127.0.0.1:8789", rawBody } = {}) {
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: token ? `Bearer ${token}` : "",
      "content-type": "application/json",
      origin,
    },
    body: rawBody ?? JSON.stringify(body),
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

const personal = (name, snapshot) => ({
  name,
  birthDate: snapshot.input.birthDate,
  birthTime: snapshot.input.birthTime,
  locationLabel: snapshot.input.locationLabel,
  timezone: snapshot.input.timezone,
});

async function consent(token, cloudSave, productAnalytics) {
  return invoke("update-consent", token, { consentVersion: "1.0", cloudSave, productAnalytics });
}

async function psql(query) {
  const { stdout } = await execFileAsync("docker", [
    "exec", "supabase_db_human-design-chart", "psql", "-U", "postgres", "-d", "postgres", "-Atc", query,
  ]);
  return stdout.trim();
}

before(async () => {
  ({ client: a, user: userA, token: tokenA } = await anonymousClient());
  ({ client: b, user: userB, token: tokenB } = await anonymousClient());
  [snapshotA, snapshotA2, snapshotB] = await Promise.all([
    makeSnapshot("1990-01-01", "12:00", "Wuhan, China"),
    makeSnapshot("1991-02-02", "13:01", "Changsha, China"),
    makeSnapshot("1986-06-24", "13:50", "Xiangtan, China"),
  ]);
});

after(async () => {
  await admin.auth.admin.deleteUser(userA.id).catch(() => {});
  await admin.auth.admin.deleteUser(userB.id).catch(() => {});
});

test("migration creates protected tables, constraints, indexes, functions, and triggers", async () => {
  const tables = (await psql("select tablename from pg_tables where schemaname='public' order by tablename")).split("\n");
  for (const table of ["app_users", "consent_records", "chart_records", "product_events", "admin_users", "admin_audit_logs"]) {
    assert.ok(tables.includes(table), table);
  }
  assert.ok(tables.includes("data_deletion_audit_logs"));
  assert.equal(await psql("select count(*) from pg_tables where schemaname='public' and rowsecurity"), "7");
  assert.equal(await psql("select count(*) from pg_extension where extname='pgcrypto'"), "1");
  assert.equal(await psql("select count(*) from information_schema.triggers where trigger_schema='public' and trigger_name='app_users_set_updated_at'"), "1");
  assert.equal(await psql("select count(*) from information_schema.routines where routine_schema='public' and routine_name in ('has_current_consent','is_pluto_admin','product_event_properties_are_safe','set_updated_at','save_client_asserted_chart','record_product_event','delete_cloud_personal_data','cleanup_expired_privacy_records')"), "8");
  assert.equal(await psql("select count(*) from information_schema.columns where table_schema='public' and table_name='chart_records' and column_name='verification_status'"), "1");
  assert.ok(Number(await psql("select count(*) from pg_indexes where schemaname='public'")) >= 10);
  assert.ok(Number(await psql("select count(*) from pg_constraint where connamespace='public'::regnamespace")) >= 20);
});

test("two real anonymous JWT users are isolated by RLS", async () => {
  assert.ifError((await a.from("app_users").insert({ id: userA.id })).error);
  assert.ifError((await b.from("app_users").insert({ id: userB.id })).error);

  assert.deepEqual((await a.from("app_users").select("id").eq("id", userB.id)).data, []);
  assert.deepEqual((await b.from("app_users").select("id").eq("id", userA.id)).data, []);
  assert.equal((await a.from("app_users").update({ updated_at: "2030-01-01T00:00:00Z" }).eq("id", userB.id).select()).data.length, 0);

  assert.equal((await consent(tokenA, true, false)).response.status, 200);
  assert.equal((await consent(tokenB, true, false)).response.status, 200);
  const aConsent = await a.from("consent_records").select("user_id,cloud_save");
  assert.deepEqual(aConsent.data.map((row) => row.user_id), [userA.id]);
  assert.deepEqual((await a.from("consent_records").select("id").eq("user_id", userB.id)).data, []);

  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: personal("User A", snapshotA) })).response.status, 200);
  assert.equal((await invoke("save-chart", tokenB, { snapshot: snapshotB, personalData: personal("User B", snapshotB) })).response.status, 200);
  assert.deepEqual((await a.from("chart_records").select("id").eq("user_id", userB.id)).data, []);
  assert.deepEqual((await b.from("chart_records").select("id").eq("user_id", userA.id)).data, []);
  assert.ok((await a.from("chart_records").update({ name: "attack" }).eq("user_id", userB.id).select()).error);
  assert.equal((await a.from("chart_records").delete().eq("user_id", userB.id).select()).data.length, 0);
  assert.equal((await b.from("chart_records").select("id")).data.length, 1);

  assert.ok((await a.from("product_events").select("id")).error);
  assert.deepEqual((await a.from("admin_users").select("user_id")).data, []);
  assert.deepEqual((await a.from("admin_audit_logs").select("id")).data, []);
  assert.ok((await a.from("data_deletion_audit_logs").select("id")).error);
});

test("cloud and analytics writes require the latest explicit consent", async () => {
  assert.equal((await consent(tokenA, false, false)).response.status, 200);
  const directDenied = await a.from("chart_records").insert({
    user_id: userA.id,
    chart_hash: snapshotA2.chartHash,
    schema_version: snapshotA2.schemaVersion,
    engine_version: snapshotA2.engineVersion,
    name: "User A",
    birth_date: snapshotA2.input.birthDate,
    birth_time: snapshotA2.input.birthTime,
    location_label: snapshotA2.input.locationLabel,
    timezone: snapshotA2.input.timezone,
    snapshot: snapshotA2,
  });
  assert.ok(directDenied.error);
  const denied = await invoke("save-chart", tokenA, { snapshot: snapshotA2, personalData: personal("User A", snapshotA2) });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.body.error, "CLOUD_STORAGE_CONSENT_REQUIRED");

  assert.equal((await consent(tokenA, true, false)).response.status, 200);
  const directStillDenied = await a.from("chart_records").insert({
    user_id: userA.id,
    chart_hash: snapshotA2.chartHash,
    schema_version: snapshotA2.schemaVersion,
    engine_version: snapshotA2.engineVersion,
    verification_status: "client_asserted",
    name: "User A",
    birth_date: snapshotA2.input.birthDate,
    birth_time: snapshotA2.input.birthTime,
    location_label: snapshotA2.input.locationLabel,
    timezone: snapshotA2.input.timezone,
    snapshot: snapshotA2,
  });
  assert.ok(directStillDenied.error);
  const directEngineVerified = await a.from("chart_records").insert({
    user_id: userA.id,
    chart_hash: snapshotA2.chartHash,
    schema_version: snapshotA2.schemaVersion,
    engine_version: snapshotA2.engineVersion,
    verification_status: "engine_verified",
    name: "User A",
    birth_date: snapshotA2.input.birthDate,
    birth_time: snapshotA2.input.birthTime,
    location_label: snapshotA2.input.locationLabel,
    timezone: snapshotA2.input.timezone,
    snapshot: { ...snapshotA2, verificationStatus: "engine_verified" },
  });
  assert.ok(directEngineVerified.error);
  assert.ok((await a.rpc("save_client_asserted_chart", {
    p_user_id: userA.id,
    p_chart_hash: snapshotA2.chartHash,
    p_schema_version: snapshotA2.schemaVersion,
    p_engine_version: snapshotA2.engineVersion,
    p_name: "User A",
    p_birth_date: snapshotA2.input.birthDate,
    p_birth_time: snapshotA2.input.birthTime,
    p_location_label: snapshotA2.input.locationLabel,
    p_timezone: snapshotA2.input.timezone,
    p_snapshot: snapshotA2,
  })).error);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA2, personalData: personal("User A", snapshotA2) })).response.status, 200);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA2, personalData: personal("User A", snapshotA2) })).response.status, 200);
  assert.equal((await a.from("chart_records").select("id", { count: "exact" }).eq("chart_hash", snapshotA2.chartHash)).count, 1);

  assert.equal((await consent(tokenA, false, false)).response.status, 200);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA2, personalData: personal("User A", snapshotA2) })).response.status, 403);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: {} })).response.status, 403);
  assert.ok((await a.from("product_events").insert({ user_id: userA.id, event_name: "app_open", properties: {} })).error);
  assert.ok((await a.rpc("record_product_event", { p_user_id: userA.id, p_event_name: "app_open", p_properties: {} })).error);

  assert.equal((await consent(tokenA, false, true)).response.status, 200);
  assert.ok((await a.from("product_events").insert({ user_id: userA.id, event_name: "app_open", properties: {} })).error);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: { environment: "test" } })).response.status, 200);
  assert.equal((await invoke("record-event", tokenA, { eventName: "not_allowed", properties: {} })).response.status, 400);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: { name: "private" } })).response.status, 400);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: { birth_date: "1990-01-01" } })).response.status, 400);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: { platform: "张三，1990年1月1日出生于武汉" } })).response.status, 400);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: { category: "任意自由文本" } })).response.status, 400);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: { schemaVersion: "非法".repeat(40) } })).response.status, 400);
  assert.equal((await invoke("record-event", tokenA, { eventName: "app_open", properties: {}, unknown: true })).response.status, 400);
  assert.ok((await admin.from("product_events").insert({ user_id: userA.id, event_name: "app_open", properties: { category: "任意自由文本" } })).error);
});

test("save-chart recomputes the canonical hash and enforces snapshot provenance and structure", async () => {
  await consent(tokenA, true, false);
  const changedContent = structuredClone(snapshotA);
  changedContent.activations.personality.sun.longitude += 0.001;
  const changedContentResult = await invoke("save-chart", tokenA, { snapshot: changedContent, personalData: personal("A", changedContent) });
  assert.equal(changedContentResult.response.status, 400);
  assert.equal(changedContentResult.body.error, "CHART_HASH_MISMATCH");

  const changedHash = { ...snapshotA, chartHash: `sha256:${"a".repeat(64)}` };
  const changedHashResult = await invoke("save-chart", tokenA, { snapshot: changedHash, personalData: personal("A", changedHash) });
  assert.equal(changedHashResult.response.status, 400);
  assert.equal(changedHashResult.body.error, "CHART_HASH_MISMATCH");

  for (const mutate of [
    (value) => { value.activations.personality.sun.gate = 65; },
    (value) => { value.activations.personality.sun.line = 0; },
    (value) => { value.activations.personality.sun.color = 7; },
    (value) => { value.activations.personality.sun.tone = 7; },
    (value) => { value.activations.personality.sun.base = 6; },
    (value) => { value.core.type = "Invalid"; },
    (value) => { value.core.authority = "Invalid"; },
    (value) => { value.core.profile = "1/1"; },
    (value) => { value.core.definition = "Invalid"; },
  ]) {
    const invalid = structuredClone(snapshotA);
    mutate(invalid);
    invalid.chartHash = await createChartHash(invalid);
    assert.equal((await invoke("save-chart", tokenA, { snapshot: invalid, personalData: personal("A", invalid) })).response.status, 400);
  }

  const forgedProvenance = { ...snapshotA, verificationStatus: PROFILE_VERIFICATION.ENGINE_VERIFIED };
  const forgedResult = await invoke("save-chart", tokenA, { snapshot: forgedProvenance, personalData: personal("A", forgedProvenance) });
  assert.equal(forgedResult.response.status, 400);
  assert.equal(forgedResult.body.error, "INVALID_VERIFICATION_STATUS");

  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: personal("A", snapshotA) })).response.status, 200);
  const stored = await admin.from("chart_records").select("verification_status,snapshot").eq("user_id", userA.id).eq("chart_hash", snapshotA.chartHash).single();
  assert.ifError(stored.error);
  assert.equal(stored.data.verification_status, "client_asserted");
  assert.equal(stored.data.snapshot.verificationStatus, "client_asserted");
});

test("Edge Functions reject forged identities, invalid fields, and oversized input", async () => {
  for (const [name, body] of [
    ["update-consent", { consentVersion: "1.0", cloudSave: true, productAnalytics: true }],
    ["save-chart", { snapshot: snapshotA, personalData: personal("A", snapshotA) }],
    ["record-event", { eventName: "app_open", properties: {} }],
    ["delete-cloud-data", { consentVersion: "1.0" }],
  ]) assert.equal((await invoke(name, "", body)).response.status, 401, name);
  assert.equal((await invoke("update-consent", tokenA, { consentVersion: "1.0", cloudSave: true, productAnalytics: true, user_id: userB.id })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: personal("A", snapshotA), user_id: userB.id })).response.status, 400);
  assert.equal((await invoke("delete-cloud-data", tokenA, { consentVersion: "1.0", user_id: userB.id })).response.status, 400);

  const longName = "x".repeat(81);
  const longPlace = "x".repeat(161);
  await consent(tokenA, true, false);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: { ...personal(longName, snapshotA) } })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: { ...personal("A", snapshotA), locationLabel: longPlace } })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: { ...personal("A", snapshotA), birthDate: "2025-02-30" } })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: { ...personal("A", snapshotA), birthTime: "25:00" } })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: { ...personal("A", snapshotA), timezone: "Mars/Olympus" } })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: { ...snapshotA, core: { ...snapshotA.core, unknown: "field" } }, personalData: personal("A", snapshotA) })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: { ...personal("A", snapshotA), locationLabel: "Mismatched place" } })).response.status, 400);
  assert.equal((await invoke("save-chart", tokenA, {}, { rawBody: JSON.stringify({ padding: "x".repeat(65 * 1024) }) })).response.status, 413);
  assert.equal((await invoke("record-event", tokenA, {}, { rawBody: JSON.stringify({ padding: "x".repeat(5 * 1024) }) })).response.status, 413);
});

test("central CORS permits Web and Capacitor origins and rejects all others", async () => {
  for (const origin of ["https://human-design.wonderelian.com", "http://127.0.0.1:8789", "http://localhost:8789", "capacitor://localhost"]) {
    const response = await fetch(`${url}/functions/v1/update-consent`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${tokenB}`, "content-type": "application/json", origin },
      body: JSON.stringify({ consentVersion: "1.0", cloudSave: true, productAnalytics: false }),
    });
    assert.equal(response.status, 200, origin);
    const { stdout } = await execFileAsync("docker", [
      "run", "--rm", "--network", "supabase_network_human-design-chart", "curlimages/curl:8.12.1",
      "-sS", "-i", "-X", "OPTIONS", "http://edge_runtime:8081/update-consent",
      "-H", `Origin: ${origin}`, "-H", "Access-Control-Request-Method: POST",
      "-H", "Access-Control-Request-Headers: authorization,apikey,content-type",
    ]);
    assert.match(stdout, /HTTP\/1\.1 204 No Content/i);
    assert.match(stdout, new RegExp(`access-control-allow-origin: ${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
  }
  const rejected = await fetch(`${url}/functions/v1/update-consent`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${tokenB}`, "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ consentVersion: "1.0", cloudSave: true, productAnalytics: false }),
  });
  assert.equal(rejected.status, 403);
  const { stdout: directRejected } = await execFileAsync("docker", [
    "run", "--rm", "--network", "supabase_network_human-design-chart", "curlimages/curl:8.12.1",
    "-sS", "-i", "-X", "OPTIONS", "http://edge_runtime:8081/update-consent",
    "-H", "Origin: https://evil.example", "-H", "Access-Control-Request-Method: POST",
    "-H", "Access-Control-Request-Headers: authorization,apikey,content-type",
  ]);
  assert.match(directRejected, /HTTP\/1\.1 403 Forbidden/i);
  assert.doesNotMatch(directRejected, /access-control-allow-origin:/i);
});

test("retention cleanup removes anonymous events after 180 days and deletion receipts after 365 days", async () => {
  const now = "2026-07-18T00:00:00.000Z";
  const oldEvent = await admin.from("product_events").insert({
    user_id: null, event_name: "app_open", properties: { environment: "test" }, created_at: "2026-01-18T23:59:59.000Z",
  }).select("id").single();
  const recentEvent = await admin.from("product_events").insert({
    user_id: null, event_name: "app_open", properties: { environment: "test" }, created_at: "2026-01-19T00:00:01.000Z",
  }).select("id").single();
  assert.ifError(oldEvent.error);
  assert.ifError(recentEvent.error);
  const oldReceipt = await admin.from("data_deletion_audit_logs").insert({
    subject_hash: `sha256:${"c".repeat(64)}`, request_id: crypto.randomUUID(), created_at: "2025-07-17T23:59:59.000Z",
  }).select("id").single();
  const recentReceipt = await admin.from("data_deletion_audit_logs").insert({
    subject_hash: `sha256:${"d".repeat(64)}`, request_id: crypto.randomUUID(), created_at: "2025-07-18T00:00:01.000Z",
  }).select("id").single();
  assert.ifError(oldReceipt.error);
  assert.ifError(recentReceipt.error);

  const cleanup = await admin.rpc("cleanup_expired_privacy_records", { p_now: now });
  assert.ifError(cleanup.error);
  assert.equal((await admin.from("product_events").select("id").eq("id", oldEvent.data.id)).data.length, 0);
  assert.equal((await admin.from("product_events").select("id").eq("id", recentEvent.data.id)).data.length, 1);
  assert.equal((await admin.from("data_deletion_audit_logs").select("id").eq("id", oldReceipt.data.id)).data.length, 0);
  assert.equal((await admin.from("data_deletion_audit_logs").select("id").eq("id", recentReceipt.data.id)).data.length, 1);
  await admin.from("product_events").delete().eq("id", recentEvent.data.id);
  await admin.from("data_deletion_audit_logs").delete().eq("id", recentReceipt.data.id);
});

test("cloud deletion is atomic, idempotent, deidentifies events, and preserves local history", async () => {
  const localHistory = [{ chartHash: "local-only" }];
  await consent(tokenA, true, true);
  await invoke("save-chart", tokenA, { snapshot: snapshotA, personalData: personal("Delete Me", snapshotA) });
  await invoke("record-event", tokenA, { eventName: "app_open", properties: { environment: "test" } });
  const aEvent = await admin.from("product_events").select("id").eq("user_id", userA.id).limit(1).single();
  assert.ifError(aEvent.error);
  const beforeB = (await admin.from("chart_records").select("id", { count: "exact", head: true }).eq("user_id", userB.id)).count;

  await psql(`
    create or replace function public.test_fail_deletion_receipt() returns trigger language plpgsql as $$
    begin raise exception 'TEST_RECEIPT_FAILURE'; end; $$;
    create trigger test_fail_deletion_receipt before insert on public.data_deletion_audit_logs
    for each row execute function public.test_fail_deletion_receipt();
  `);
  try {
    const failed = await invoke("delete-cloud-data", tokenA, { consentVersion: "1.0" });
    assert.equal(failed.response.status, 500);
    assert.ok((await admin.from("chart_records").select("id", { count: "exact", head: true }).eq("user_id", userA.id)).count > 0);
    assert.ok((await admin.from("consent_records").select("id", { count: "exact", head: true }).eq("user_id", userA.id)).count > 0);
    assert.equal((await admin.from("app_users").select("id", { count: "exact", head: true }).eq("id", userA.id)).count, 1);
  } finally {
    await psql("drop trigger if exists test_fail_deletion_receipt on public.data_deletion_audit_logs; drop function if exists public.test_fail_deletion_receipt();");
  }

  const deletion = await invoke("delete-cloud-data", tokenA, { consentVersion: "1.0" });
  assert.equal(deletion.response.status, 200);
  assert.equal(deletion.body.localHistoryAffected, false);
  assert.deepEqual(localHistory, [{ chartHash: "local-only" }]);
  assert.equal((await admin.from("chart_records").select("id", { count: "exact", head: true }).eq("user_id", userA.id)).count, 0);
  assert.equal((await admin.from("consent_records").select("id", { count: "exact", head: true }).eq("user_id", userA.id)).count, 0);
  assert.equal((await admin.from("chart_records").select("id", { count: "exact", head: true }).eq("user_id", userB.id)).count, beforeB);
  assert.equal((await admin.from("product_events").select("user_id").eq("id", aEvent.data.id).single()).data.user_id, null);

  const repeated = await invoke("delete-cloud-data", tokenA, { consentVersion: "1.0" });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.body.requestId, deletion.body.requestId);
  assert.equal(repeated.body.deletedChartCount, deletion.body.deletedChartCount);
  assert.equal(repeated.body.deidentifiedEventCount, deletion.body.deidentifiedEventCount);

  const { data: receipts, error } = await admin.from("data_deletion_audit_logs").select("subject_hash,request_id,deleted_chart_count,deidentified_event_count").eq("request_id", deletion.body.requestId);
  assert.ifError(error);
  assert.equal(receipts.length, 1);
  assert.match(receipts[0].subject_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(receipts).includes(snapshotA.input.birthDate), false);
  assert.equal(JSON.stringify(receipts).includes(snapshotA.input.locationLabel), false);
});

test("Edge Runtime logs do not contain submitted birth fields or request bodies", async () => {
  const markerName = "EDGE_PRIVATE_NAME_MARKER";
  const markerLocation = "EDGE_PRIVATE_LOCATION_MARKER";
  await consent(tokenB, true, false);
  const marked = {
    ...snapshotB,
    input: { ...snapshotB.input, locationLabel: markerLocation },
  };
  assert.equal((await invoke("save-chart", tokenB, { snapshot: marked, personalData: { ...personal(markerName, marked), locationLabel: markerLocation } })).response.status, 200);
  const { stdout, stderr } = await execFileAsync("docker", ["logs", "--tail", "400", "supabase_edge_runtime_human-design-chart"]);
  const logs = `${stdout}${stderr}`;
  for (const sensitive of [markerName, markerLocation, marked.input.birthDate, marked.input.birthTime, marked.chartHash]) {
    assert.equal(logs.includes(sensitive), false, sensitive);
  }
});
