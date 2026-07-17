import { authenticatedClients } from "../_shared/auth.ts";
import { errorResponse, exactObject, HttpError, json, limitedJson, originAllowed, preflight } from "../_shared/http.ts";

async function hashSubject(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  if (!originAllowed(request)) return json(request, 403, { error: "ORIGIN_NOT_ALLOWED" });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 1024);
    if (!exactObject(body, ["consentVersion"])) throw new HttpError(400, "INVALID_REQUEST");
    const requestId = crypto.randomUUID();
    const charts = await adminClient.from("chart_records").delete().eq("user_id", user.id).select("id");
    const consent = await adminClient.from("consent_records").delete().eq("user_id", user.id);
    const profile = await adminClient.from("app_users").delete().eq("id", user.id);
    if (charts.error || consent.error || profile.error) throw charts.error || consent.error || profile.error;
    const receipt = await adminClient.from("data_deletion_audit_logs").insert({
      subject_hash: await hashSubject(user.id),
      request_id: requestId,
      deleted_chart_count: charts.data?.length || 0,
    });
    if (receipt.error) throw receipt.error;
    return json(request, 200, { deleted: true, localHistoryAffected: false, requestId });
  } catch (error) {
    return errorResponse(request, error, "DELETE_FAILED");
  }
});
