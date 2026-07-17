export const DEFAULT_ORIGINS = [
  "https://human-design.wonderelian.com",
  "http://127.0.0.1:8789",
  "http://localhost:8789",
  "capacitor://localhost",
];

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "";
  const allowed = (Deno.env.get("PLUTO_CORS_ORIGINS") || DEFAULT_ORIGINS.join(","))
    .split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {};
}

export function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return Boolean((corsHeaders(request) as Record<string, string>)["Access-Control-Allow-Origin"]);
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
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "INVALID_CONTENT_TYPE");
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE");
  if (!raw) throw new HttpError(400, "INVALID_JSON");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "INVALID_JSON");
  }
}

export function exactObject(value: unknown, fields: string[]) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value as Record<string, unknown>).every((key) => fields.includes(key));
}

export function errorResponse(request: Request, error: unknown, fallback = "REQUEST_FAILED") {
  if (error instanceof HttpError) return json(request, error.status, { error: error.code });
  if (error instanceof Error && error.message === "UNAUTHORIZED") return json(request, 401, { error: "UNAUTHORIZED" });
  return json(request, 500, { error: fallback });
}
