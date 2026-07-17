import { authenticatedClients } from "../_shared/auth.ts";
import { json, limitedJson, preflight } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, 405, { error: "Method not allowed." });
  try {
    const { user, adminClient } = await authenticatedClients(request);
    const body = await limitedJson(request, 2 * 1024);
    if (typeof body?.cloudSave !== "boolean" || typeof body?.productAnalytics !== "boolean") {
      return json(request, 400, { error: "Invalid consent state." });
    }
    const { error } = await adminClient.from("consent_records").insert({
      user_id: user.id,
      consent_version: String(body.consentVersion || "1.0").slice(0, 32),
      cloud_save: body.cloudSave,
      product_analytics: body.productAnalytics,
    });
    if (error) throw error;
    return json(request, 200, { recorded: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400;
    return json(request, status, { error: status === 401 ? "Unauthorized." : "Unable to update consent." });
  }
});
