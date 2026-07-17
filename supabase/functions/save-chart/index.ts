import { authenticatedClients, requireCurrentConsent } from "../_shared/auth.ts";
import { errorResponse, exactObject, HttpError, json, limitedJson, originAllowed, preflight } from "../_shared/http.ts";
import { validProfileSnapshot } from "../_shared/snapshot.ts";

const PERSONAL_FIELDS = ["name", "birthDate", "birthTime", "locationLabel", "timezone"];
const SNAPSHOT_FIELDS = ["schemaVersion", "engineVersion", "chartHash", "generatedAt", "input", "core", "activations", "structure", "meta"];
const BODY_FIELDS = ["snapshot", "personalData"];

function validTimezone(value: unknown) {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  if (!originAllowed(request)) return json(request, 403, { error: "ORIGIN_NOT_ALLOWED" });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 64 * 1024);
    if (!exactObject(body, BODY_FIELDS) || !exactObject(body?.personalData, PERSONAL_FIELDS) || !exactObject(body?.snapshot, SNAPSHOT_FIELDS) || !validProfileSnapshot(body?.snapshot)) {
      throw new HttpError(400, "INVALID_REQUEST");
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(body.snapshot.chartHash || "")) throw new HttpError(400, "INVALID_CHART_HASH");
    if (typeof body.personalData.name !== "string" || body.personalData.name.length < 1 || body.personalData.name.length > 80) throw new HttpError(400, "INVALID_NAME");
    if (typeof body.personalData.locationLabel !== "string" || body.personalData.locationLabel.length > 160) throw new HttpError(400, "INVALID_LOCATION");
    if (!validDate(body.personalData.birthDate)) throw new HttpError(400, "INVALID_BIRTH_DATE");
    if (typeof body.personalData.birthTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.personalData.birthTime)) throw new HttpError(400, "INVALID_BIRTH_TIME");
    if (!validTimezone(body.personalData.timezone)) throw new HttpError(400, "INVALID_TIMEZONE");
    if (
      body.personalData.birthDate !== body.snapshot.input.birthDate
      || body.personalData.birthTime !== body.snapshot.input.birthTime
      || body.personalData.locationLabel !== body.snapshot.input.locationLabel
      || body.personalData.timezone !== body.snapshot.input.timezone
    ) throw new HttpError(400, "SNAPSHOT_INPUT_MISMATCH");
    await requireCurrentConsent(adminClient, user.id, "cloud_save");
    const { error } = await adminClient.from("chart_records").upsert({
      user_id: user.id,
      chart_hash: body.snapshot.chartHash,
      schema_version: body.snapshot.schemaVersion,
      engine_version: body.snapshot.engineVersion,
      name: body.personalData.name,
      birth_date: body.personalData.birthDate,
      birth_time: body.personalData.birthTime,
      location_label: body.personalData.locationLabel,
      timezone: body.personalData.timezone,
      snapshot: body.snapshot,
    }, { onConflict: "user_id,chart_hash" });
    if (error) throw error;
    return json(request, 200, { saved: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return json(request, 403, { error: "CLOUD_STORAGE_CONSENT_REQUIRED" });
    return errorResponse(request, error, "SAVE_FAILED");
  }
});
