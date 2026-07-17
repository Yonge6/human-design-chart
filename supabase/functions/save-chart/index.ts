import { authenticatedClients } from "../_shared/auth.ts";
import { json, limitedJson, preflight } from "../_shared/http.ts";

const PERSONAL_FIELDS = ["name", "birthDate", "birthTime", "locationLabel", "timezone"];
const SNAPSHOT_FIELDS = ["schemaVersion", "engineVersion", "chartHash", "generatedAt", "input", "core", "activations", "structure", "meta"];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 128 * 1024);
    if (!body?.snapshot || !body?.personalData) return json(request, 400, { error: "Invalid request." });
    if (Object.keys(body.personalData).some((key) => !PERSONAL_FIELDS.includes(key))) return json(request, 400, { error: "Unsupported personal data field." });
    if (Object.keys(body.snapshot).some((key) => !SNAPSHOT_FIELDS.includes(key))) return json(request, 400, { error: "Unsupported snapshot field." });
    if (!/^sha256:[a-f0-9]{64}$/.test(body.snapshot.chartHash || "")) return json(request, 400, { error: "Invalid chart hash." });

    await adminClient.from("consent_records").insert({
      user_id: user.id,
      consent_version: String(body.consentVersion || "1.0").slice(0, 32),
      cloud_save: body.consent?.cloudSave === true,
      product_analytics: body.consent?.productAnalytics === true,
    });
    const { error } = await adminClient.from("chart_records").upsert({
      user_id: user.id,
      chart_hash: body.snapshot.chartHash,
      schema_version: body.snapshot.schemaVersion,
      engine_version: body.snapshot.engineVersion,
      name: String(body.personalData.name || "").slice(0, 80),
      birth_date: body.personalData.birthDate,
      birth_time: body.personalData.birthTime,
      location_label: String(body.personalData.locationLabel || "").slice(0, 160),
      timezone: String(body.personalData.timezone || "").slice(0, 64),
      snapshot: body.snapshot,
    }, { onConflict: "user_id,chart_hash" });
    if (error) throw error;
    return json(request, 200, { saved: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400;
    return json(request, status, { error: status === 401 ? "Unauthorized." : "Unable to save chart." });
  }
});
