const DEFAULT_ORIGINS = ["https://human-design.wonderelian.com"];

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "";
  const allowed = (Deno.env.get("PLUTO_CORS_ORIGINS") || DEFAULT_ORIGINS.join(","))
    .split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {};
}

export function json(request: Request, status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) },
  });
}

export function preflight(request: Request) {
  const headers = corsHeaders(request);
  if (!(headers as Record<string, string>)["Access-Control-Allow-Origin"]) return json(request, 403, { error: "Origin is not allowed." });
  return new Response(null, {
    status: 204,
    headers: { ...headers, "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" },
  });
}

export async function limitedJson(request: Request, maxBytes = 32 * 1024) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(raw);
}
