import { authenticatedClients } from "../_shared/auth.ts";
import { errorResponse, exactObject, HttpError, json, limitedJson, originAllowed, preflight } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  if (!originAllowed(request)) return json(request, 403, { error: "ORIGIN_NOT_ALLOWED" });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 2 * 1024);
    if (!exactObject(body, ["consentVersion", "cloudSave", "productAnalytics"])) throw new HttpError(400, "INVALID_REQUEST");
    if (typeof body?.cloudSave !== "boolean" || typeof body?.productAnalytics !== "boolean") {
      throw new HttpError(400, "INVALID_CONSENT");
    }
    if (typeof body.consentVersion !== "string" || body.consentVersion.length < 1 || body.consentVersion.length > 32) throw new HttpError(400, "INVALID_CONSENT_VERSION");
    const { error } = await adminClient.from("consent_records").insert({
      user_id: user.id,
      consent_version: String(body.consentVersion || "1.0").slice(0, 32),
      cloud_save: body.cloudSave,
      product_analytics: body.productAnalytics,
    });
    if (error) throw error;
    return json(request, 200, { recorded: true });
  } catch (error) {
    return errorResponse(request, error, "CONSENT_UPDATE_FAILED");
  }
});
