import { authenticatedClients, requireCurrentConsent } from "../_shared/auth.ts";
import { errorResponse, exactObject, HttpError, json, limitedJson, originAllowed, preflight } from "../_shared/http.ts";
import { createChartHash, PROFILE_VERIFICATION, validateHumanDesignProfileSnapshot } from "../_shared/snapshot.ts";

const PERSONAL_FIELDS = ["name", "birthDate", "birthTime", "locationLabel", "timezone"];
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
    if (!exactObject(body, BODY_FIELDS) || !exactObject(body?.personalData, PERSONAL_FIELDS)) {
      throw new HttpError(400, "INVALID_REQUEST");
    }
    const validation = validateHumanDesignProfileSnapshot(body?.snapshot, {
      allowedVerificationStatuses: [PROFILE_VERIFICATION.CLIENT_ASSERTED],
    });
    if (!validation.valid) throw new HttpError(400, validation.reason === "INVALID_VERIFICATION_STATUS" ? "INVALID_VERIFICATION_STATUS" : "INVALID_REQUEST");
    const serverHash = await createChartHash(body.snapshot);
    if (serverHash !== body.snapshot.chartHash) throw new HttpError(400, "CHART_HASH_MISMATCH");
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
    const { error } = await adminClient.rpc("save_client_asserted_chart", {
      p_user_id: user.id,
      p_chart_hash: body.snapshot.chartHash,
      p_schema_version: body.snapshot.schemaVersion,
      p_engine_version: body.snapshot.engineVersion,
      p_name: body.personalData.name,
      p_birth_date: body.personalData.birthDate,
      p_birth_time: body.personalData.birthTime,
      p_location_label: body.personalData.locationLabel,
      p_timezone: body.personalData.timezone,
      p_snapshot: body.snapshot,
    });
    if (error) throw error;
    return json(request, 200, { saved: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return json(request, 403, { error: "CLOUD_STORAGE_CONSENT_REQUIRED" });
    return errorResponse(request, error, "SAVE_FAILED");
  }
});
