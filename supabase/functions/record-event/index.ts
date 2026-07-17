import { authenticatedClients, requireCurrentConsent } from "../_shared/auth.ts";
import { errorResponse, exactObject, HttpError, json, limitedJson, originAllowed, preflight } from "../_shared/http.ts";

const EVENTS = new Set([
  "app_open", "form_started", "chart_generate_started", "chart_generate_succeeded", "chart_generate_failed",
  "detail_opened", "poster_saved", "share_started", "share_completed", "share_cancelled",
  "language_changed", "privacy_mode_changed",
]);
const FORBIDDEN = ["name", "birthDate", "birthTime", "location", "locationLabel", "query", "latitude", "longitude", "chart", "snapshot", "text", "contacts", "clipboard", "userAgent", "stack"];
const PROPERTY_FIELDS = new Set(["language", "setting", "enabled", "environment", "schemaVersion", "engineVersion", "category", "format", "surface", "platform"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  if (!originAllowed(request)) return json(request, 403, { error: "ORIGIN_NOT_ALLOWED" });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 4 * 1024);
    if (!exactObject(body, ["eventName", "properties"])) throw new HttpError(400, "INVALID_REQUEST");
    if (!EVENTS.has(body?.eventName) || !body.properties || typeof body.properties !== "object" || Array.isArray(body.properties)) {
      return json(request, 400, { error: "Invalid event." });
    }
    if (Object.keys(body.properties).some((key) => FORBIDDEN.includes(key) || !PROPERTY_FIELDS.has(key))) return json(request, 400, { error: "Unsupported event field." });
    if (Object.values(body.properties).some((value) => value !== null && !["string", "number", "boolean"].includes(typeof value))) {
      return json(request, 400, { error: "Event properties must be flat scalar values." });
    }
    await requireCurrentConsent(adminClient, user.id, "product_analytics");
    const { error } = await adminClient.from("product_events").insert({ user_id: user.id, event_name: body.eventName, properties: body.properties });
    if (error) throw error;
    return json(request, 200, { recorded: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return json(request, 403, { error: "ANALYTICS_CONSENT_REQUIRED" });
    return errorResponse(request, error, "EVENT_FAILED");
  }
});
