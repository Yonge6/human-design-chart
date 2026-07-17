import { authenticatedClients } from "../_shared/auth.ts";
import { errorResponse, exactObject, HttpError, json, limitedJson, originAllowed, preflight } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  if (!originAllowed(request)) return json(request, 403, { error: "ORIGIN_NOT_ALLOWED" });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 1024);
    if (!exactObject(body, ["consentVersion"])) throw new HttpError(400, "INVALID_REQUEST");
    if (body.consentVersion !== "1.0") throw new HttpError(400, "INVALID_CONSENT_VERSION");
    const { data, error } = await adminClient.rpc("delete_cloud_personal_data", { p_user_id: user.id });
    if (error) throw error;
    const receipt = data?.[0];
    return json(request, 200, {
      deleted: true,
      localHistoryAffected: false,
      requestId: receipt?.request_id,
      deletedChartCount: receipt?.deleted_chart_count || 0,
      deidentifiedEventCount: receipt?.deidentified_event_count || 0,
    });
  } catch (error) {
    return errorResponse(request, error, "DELETE_FAILED");
  }
});
