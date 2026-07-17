import { authenticatedClients } from "../_shared/auth.ts";
import { json, limitedJson, preflight } from "../_shared/http.ts";

const EVENTS = new Set([
  "app_open", "form_started", "chart_generate_started", "chart_generate_succeeded", "chart_generate_failed",
  "detail_opened", "poster_saved", "share_started", "share_completed", "share_cancelled",
  "language_changed", "privacy_mode_changed",
]);
const FORBIDDEN = ["name", "birthDate", "birthTime", "location", "locationLabel", "query", "latitude", "longitude", "chart", "snapshot", "text", "contacts", "clipboard", "userAgent", "stack"];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 4 * 1024);
    if (!EVENTS.has(body?.eventName) || !body.properties || typeof body.properties !== "object" || Array.isArray(body.properties)) {
      return json(request, 400, { error: "Invalid event." });
    }
    if (Object.keys(body.properties).some((key) => FORBIDDEN.includes(key))) return json(request, 400, { error: "Sensitive fields are not accepted." });
    if (Object.values(body.properties).some((value) => value !== null && !["string", "number", "boolean"].includes(typeof value))) {
      return json(request, 400, { error: "Event properties must be flat scalar values." });
    }
    await adminClient.from("consent_records").insert({
      user_id: user.id,
      consent_version: String(body.consentVersion || "1.0").slice(0, 32),
      cloud_save: body.consent?.cloudSave === true,
      product_analytics: body.consent?.productAnalytics === true,
    });
    const { error } = await adminClient.from("product_events").insert({ user_id: user.id, event_name: body.eventName, properties: body.properties });
    if (error) throw error;
    return json(request, 200, { recorded: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400;
    return json(request, status, { error: status === 401 ? "Unauthorized." : "Unable to record event." });
  }
});
