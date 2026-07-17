import { authenticatedClients, requireCurrentConsent } from "../_shared/auth.ts";
import { errorResponse, exactObject, HttpError, json, limitedJson, originAllowed, preflight } from "../_shared/http.ts";
import { validateProductEvent } from "../_shared/product-event-contract.js";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  if (!originAllowed(request)) return json(request, 403, { error: "ORIGIN_NOT_ALLOWED" });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 4 * 1024);
    if (!exactObject(body, ["eventName", "properties"])) throw new HttpError(400, "INVALID_REQUEST");
    const validation = validateProductEvent(body?.eventName, body?.properties);
    if (!validation.valid) throw new HttpError(400, validation.reason || "INVALID_EVENT");
    await requireCurrentConsent(adminClient, user.id, "product_analytics");
    const { error } = await adminClient.rpc("record_product_event", {
      p_user_id: user.id,
      p_event_name: body.eventName,
      p_properties: body.properties,
    });
    if (error) throw error;
    return json(request, 200, { recorded: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return json(request, 403, { error: "ANALYTICS_CONSENT_REQUIRED" });
    return errorResponse(request, error, "EVENT_FAILED");
  }
});
