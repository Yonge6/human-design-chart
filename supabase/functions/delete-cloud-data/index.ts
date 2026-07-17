import { authenticatedClients } from "../_shared/auth.ts";
import { json, preflight } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const charts = await adminClient.from("chart_records").delete().eq("user_id", user.id);
    const consent = await adminClient.from("consent_records").delete().eq("user_id", user.id);
    const profile = await adminClient.from("app_users").delete().eq("id", user.id);
    if (charts.error || consent.error || profile.error) throw charts.error || consent.error || profile.error;
    return json(request, 200, { deleted: true, localHistoryAffected: false });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400;
    return json(request, status, { error: status === 401 ? "Unauthorized." : "Unable to delete cloud data." });
  }
});
