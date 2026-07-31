import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { installNodeFileFetch } from "./node-file-fetch.mjs";
import {
  calculateHumanDesign,
  ENGINE_VERSION,
  localToUtcCandidates,
} from "../src/engine/human-design-engine.js";
import {
  createHumanDesignProfileSnapshot,
  PROFILE_SCHEMA_VERSION,
} from "../src/engine/profile-snapshot.js";
import { PROFILE_VERIFICATION } from "../shared/human-design-profile-contract.js";

installNodeFileFetch();

const ALLOWED_ORIGINS = new Set([
  "https://yonge6.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = 12;
const rateEntries = new Map();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_NAMES = new Set([
  "app_open",
  "chapter_view",
  "directory_open",
  "chance_chapter",
  "language_change",
  "theme_change",
  "composer_focus",
  "question_submit",
  "profile_open",
  "profile_saved",
  "chart_calculated",
  "feedback_submit",
  "contact_click",
]);

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function corsHeaders(origin) {
  return origin && ALLOWED_ORIGINS.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      }
    : {};
}

function sendJson(response, status, requestId, data = null, error = null, headers = {}) {
  response.status(status);
  Object.entries({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  }).forEach(([name, value]) => response.setHeader(name, value));
  response.json({ data, requestId, error });
}

function validTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function parseInput(rawBody) {
  const serialized = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  if (Buffer.byteLength(serialized || "", "utf8") > MAX_BODY_BYTES) {
    throw new ApiError(413, "INVALID_REQUEST", "Request body is too large.");
  }
  let body = rawBody;
  if (typeof rawBody === "string") {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new ApiError(400, "INVALID_REQUEST", "Request body must contain valid JSON.");
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_REQUEST", "A JSON object is required.");
  }
  const allowed = new Set(["birthDate", "birthTime", "timezone", "locationLabel", "timeDisambiguation"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    throw new ApiError(400, "INVALID_REQUEST", "The request contains unsupported fields.");
  }
  if (typeof body.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) {
    throw new ApiError(400, "INVALID_BIRTH_DATE", "birthDate must use YYYY-MM-DD.");
  }
  if (typeof body.birthTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.birthTime)) {
    throw new ApiError(400, "INVALID_BIRTH_TIME", "birthTime must use 24-hour HH:mm.");
  }
  if (typeof body.timezone !== "string" || body.timezone.length > 64 || !validTimezone(body.timezone)) {
    throw new ApiError(400, "INVALID_TIMEZONE", "timezone must be a valid IANA time zone.");
  }
  if (typeof body.locationLabel !== "string" || body.locationLabel.length > 160) {
    throw new ApiError(400, "INVALID_REQUEST", "locationLabel must be at most 160 characters.");
  }
  if (body.timeDisambiguation !== undefined && !["earlier", "later"].includes(body.timeDisambiguation)) {
    throw new ApiError(400, "INVALID_REQUEST", "timeDisambiguation must be earlier or later.");
  }

  const [year, month, day] = body.birthDate.split("-").map(Number);
  const [hour, minute] = body.birthTime.split(":").map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() + 1 !== month
    || normalized.getUTCDate() !== day
  ) {
    throw new ApiError(400, "INVALID_BIRTH_DATE", "birthDate is not a valid calendar date.");
  }
  return { ...body, year, month, day, hour, minute };
}

function allowRequest(request) {
  const client = String(request.headers["x-vercel-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",", 1)[0]
    .trim();
  const now = Date.now();
  const current = rateEntries.get(client);
  if (!current || current.resetAt <= now) {
    rateEntries.set(client, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

async function calculateSnapshot(input) {
  const candidates = localToUtcCandidates(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    input.timezone,
  );
  if (!candidates.length) {
    throw new ApiError(422, "NONEXISTENT_LOCAL_TIME", "The local time did not exist in the specified time zone.");
  }
  if (candidates.length > 1 && !input.timeDisambiguation) {
    throw new ApiError(409, "AMBIGUOUS_LOCAL_TIME", "The local time occurred twice; provide timeDisambiguation.");
  }

  const result = await calculateHumanDesign({
    name: "",
    location: input.locationLabel,
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    timezone: input.timezone,
    timeDisambiguation: input.timeDisambiguation || "earlier",
  });
  return createHumanDesignProfileSnapshot({
    input: {
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      timezone: input.timezone,
      locationLabel: input.locationLabel,
    },
    result,
    verificationStatus: PROFILE_VERIFICATION.ENGINE_VERIFIED,
  });
}

function parseJsonObject(rawBody) {
  const serialized = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  if (Buffer.byteLength(serialized || "", "utf8") > MAX_BODY_BYTES) {
    throw new ApiError(413, "INVALID_REQUEST", "Request body is too large.");
  }
  let body = rawBody;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      throw new ApiError(400, "INVALID_REQUEST", "Request body must contain valid JSON.");
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_REQUEST", "A JSON object is required.");
  }
  return body;
}

function stringValue(value, name, { min = 0, max = 200, optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new ApiError(400, "INVALID_REQUEST", `${name} is invalid.`);
  }
  return value;
}

function uuidValue(value, name) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ApiError(400, "INVALID_REQUEST", `${name} must be a UUID.`);
  }
  return value;
}

function chapterValue(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 81) {
    throw new ApiError(400, "INVALID_REQUEST", "chapterId is invalid.");
  }
  return value;
}

function objectValue(value, name, maxBytes = 12 * 1024) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_REQUEST", `${name} must be an object.`);
  }
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > maxBytes) {
    throw new ApiError(400, "INVALID_REQUEST", `${name} is too large.`);
  }
  return value;
}

function configuredSupabase() {
  const url = process.env.WENDAO_SUPABASE_URL;
  const key = process.env.WENDAO_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(503, "BACKEND_UNAVAILABLE", "The data service is unavailable.");
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(path, { method = "GET", body, prefer, count = false } = {}) {
  const { url, key } = configuredSupabase();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
      ...(count ? { Prefer: "count=exact" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(503, "BACKEND_UNAVAILABLE", "The data service is unavailable.");
  }
  const text = await response.text();
  const range = response.headers.get("content-range");
  const total = range?.includes("/") ? Number(range.split("/").pop()) : null;
  return {
    data: text ? JSON.parse(text) : null,
    count: Number.isFinite(total) ? total : null,
  };
}

function parseProfile(rawBody) {
  const body = parseJsonObject(rawBody);
  const allowed = new Set([
    "clientId",
    "name",
    "birthDate",
    "birthTime",
    "birthPlace",
    "timezone",
    "chartHash",
    "chartCore",
    "chartStructure",
    "consentAt",
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    throw new ApiError(400, "INVALID_REQUEST", "The profile contains unsupported fields.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate || "")) {
    throw new ApiError(400, "INVALID_REQUEST", "birthDate is invalid.");
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.birthTime || "")) {
    throw new ApiError(400, "INVALID_REQUEST", "birthTime is invalid.");
  }
  if (!validTimezone(body.timezone)) {
    throw new ApiError(400, "INVALID_REQUEST", "timezone is invalid.");
  }
  const consentAt = new Date(body.consentAt);
  if (Number.isNaN(consentAt.getTime())) {
    throw new ApiError(400, "INVALID_REQUEST", "consentAt is invalid.");
  }
  return {
    client_id: uuidValue(body.clientId, "clientId"),
    name: stringValue(body.name, "name", { max: 100, optional: true }),
    birth_date: body.birthDate,
    birth_time: body.birthTime,
    birth_place: stringValue(body.birthPlace, "birthPlace", { min: 1, max: 160 }),
    timezone: body.timezone,
    chart_hash: stringValue(body.chartHash, "chartHash", { min: 8, max: 96 }),
    chart_core: objectValue(body.chartCore, "chartCore"),
    chart_structure: objectValue(body.chartStructure, "chartStructure"),
    consent_at: consentAt.toISOString(),
  };
}

function parseFeedback(rawBody) {
  const body = parseJsonObject(rawBody);
  return {
    client_id: body.clientId ? uuidValue(body.clientId, "clientId") : null,
    message: stringValue(body.message, "message", { min: 2, max: 2000 }),
    contact: stringValue(body.contact, "contact", { max: 200, optional: true }),
    locale: body.locale === "en" ? "en" : "zh",
    chapter_id: chapterValue(body.chapterId),
    page_path: stringValue(body.pagePath, "pagePath", { max: 240, optional: true }),
    app_version: stringValue(body.appVersion, "appVersion", { max: 80, optional: true }),
    status: "new",
  };
}

function parseConversation(rawBody) {
  const body = parseJsonObject(rawBody);
  return {
    client_id: body.clientId ? uuidValue(body.clientId, "clientId") : null,
    session_id: uuidValue(body.sessionId, "sessionId"),
    chapter_id: chapterValue(body.chapterId),
    locale: body.locale === "en" ? "en" : "zh",
    question: stringValue(body.question, "question", { min: 1, max: 2000 }),
    answer: stringValue(body.answer, "answer", { min: 1, max: 6000 }),
    chart_hash: stringValue(body.chartHash, "chartHash", { max: 96, optional: true }),
  };
}

function parseEvent(rawBody) {
  const body = parseJsonObject(rawBody);
  if (!EVENT_NAMES.has(body.eventName)) {
    throw new ApiError(400, "INVALID_REQUEST", "eventName is invalid.");
  }
  const metadata = body.metadata === undefined ? {} : objectValue(body.metadata, "metadata", 2048);
  const allowedMetadata = new Set(["target", "value", "questionLength", "source", "scrollDepth"]);
  if (Object.keys(metadata).some((key) => !allowedMetadata.has(key))) {
    throw new ApiError(400, "INVALID_REQUEST", "metadata contains unsupported fields.");
  }
  return {
    client_id: body.clientId ? uuidValue(body.clientId, "clientId") : null,
    session_id: uuidValue(body.sessionId, "sessionId"),
    event_name: body.eventName,
    chapter_id: chapterValue(body.chapterId),
    locale: body.locale === "en" ? "en" : "zh",
    metadata,
  };
}

function encodeTokenPart(value) {
  return Buffer.from(value).toString("base64url");
}

function adminSecret() {
  const secret = process.env.WENDAO_ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new ApiError(503, "BACKEND_UNAVAILABLE", "Admin login is unavailable.");
  }
  return secret;
}

function signAdminToken() {
  const payload = encodeTokenPart(JSON.stringify({
    scope: "wendao-admin",
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
  }));
  const signature = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyAdmin(request) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new ApiError(401, "UNAUTHORIZED", "Admin login is required.");
  const expected = createHmac("sha256", adminSecret()).update(payload).digest();
  let provided;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    throw new ApiError(401, "UNAUTHORIZED", "Admin login is invalid.");
  }
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new ApiError(401, "UNAUTHORIZED", "Admin login is invalid.");
  }
  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new ApiError(401, "UNAUTHORIZED", "Admin login is invalid.");
  }
  if (claims.scope !== "wendao-admin" || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new ApiError(401, "UNAUTHORIZED", "Admin login has expired.");
  }
}

async function adminOverview() {
  const [profiles, feedback, conversations, events] = await Promise.all([
    supabaseRequest("wendao_profiles?select=*&order=updated_at.desc&limit=100", { count: true }),
    supabaseRequest("wendao_feedback?select=*&order=created_at.desc&limit=100", { count: true }),
    supabaseRequest("wendao_conversations?select=*&order=created_at.desc&limit=100", { count: true }),
    supabaseRequest("wendao_events?select=event_name,created_at&order=created_at.desc&limit=1000", { count: true }),
  ]);
  const eventBreakdown = {};
  for (const event of events.data || []) {
    eventBreakdown[event.event_name] = (eventBreakdown[event.event_name] || 0) + 1;
  }
  return {
    summary: {
      profiles: profiles.count ?? profiles.data?.length ?? 0,
      feedback: feedback.count ?? feedback.data?.length ?? 0,
      conversations: conversations.count ?? conversations.data?.length ?? 0,
      events: events.count ?? events.data?.length ?? 0,
    },
    profiles: profiles.data || [],
    feedback: feedback.data || [],
    conversations: conversations.data || [],
    eventBreakdown,
  };
}

export default async function handler(request, response) {
  const requestId = randomUUID();
  const origin = request.headers.origin;
  const headers = corsHeaders(origin);

  try {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      throw new ApiError(403, "INVALID_REQUEST", "Origin is not allowed.");
    }
    if (request.method === "OPTIONS") {
      Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
      response.status(204).end();
      return;
    }

    const route = String(request.query.route || "");
    if (request.method === "GET" && route === "health") {
      sendJson(response, 200, requestId, { status: "ok" }, null, headers);
      return;
    }
    if (request.method === "GET" && route === "version") {
      sendJson(response, 200, requestId, {
        appVersion: process.env.PLUTO_APP_VERSION || "1.1.0",
        gitCommit: process.env.PLUTO_GIT_COMMIT || "development",
        buildDate: process.env.PLUTO_BUILD_DATE || "development",
        schemaVersion: PROFILE_SCHEMA_VERSION,
        engineVersion: ENGINE_VERSION,
      }, null, headers);
      return;
    }
    if (request.method === "POST" && route === "charts") {
      if (!allowRequest(request)) {
        throw new ApiError(429, "RATE_LIMITED", "Too many requests; try again later.");
      }
      const snapshot = await calculateSnapshot(parseInput(request.body));
      sendJson(response, 200, requestId, snapshot, null, headers);
      return;
    }
    if (request.method === "POST" && route === "profiles") {
      if (!allowRequest(request)) throw new ApiError(429, "RATE_LIMITED", "Too many requests; try again later.");
      await supabaseRequest("wendao_profiles?on_conflict=client_id", {
        method: "POST",
        body: parseProfile(request.body),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      sendJson(response, 201, requestId, { saved: true }, null, headers);
      return;
    }
    if (request.method === "POST" && route === "feedback") {
      if (!allowRequest(request)) throw new ApiError(429, "RATE_LIMITED", "Too many requests; try again later.");
      await supabaseRequest("wendao_feedback", {
        method: "POST",
        body: parseFeedback(request.body),
        prefer: "return=minimal",
      });
      sendJson(response, 201, requestId, { saved: true }, null, headers);
      return;
    }
    if (request.method === "POST" && route === "conversations") {
      if (!allowRequest(request)) throw new ApiError(429, "RATE_LIMITED", "Too many requests; try again later.");
      await supabaseRequest("wendao_conversations", {
        method: "POST",
        body: parseConversation(request.body),
        prefer: "return=minimal",
      });
      sendJson(response, 201, requestId, { saved: true }, null, headers);
      return;
    }
    if (request.method === "POST" && route === "events") {
      if (!allowRequest(request)) throw new ApiError(429, "RATE_LIMITED", "Too many requests; try again later.");
      await supabaseRequest("wendao_events", {
        method: "POST",
        body: parseEvent(request.body),
        prefer: "return=minimal",
      });
      sendJson(response, 201, requestId, { saved: true }, null, headers);
      return;
    }
    if (request.method === "POST" && route === "admin-login") {
      if (!allowRequest(request)) throw new ApiError(429, "RATE_LIMITED", "Too many requests; try again later.");
      const body = parseJsonObject(request.body);
      const provided = Buffer.from(stringValue(body.password, "password", { min: 1, max: 100 }));
      const expected = Buffer.from(process.env.WENDAO_ADMIN_PASSWORD || "");
      if (!expected.length || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        throw new ApiError(401, "UNAUTHORIZED", "密码不正确。");
      }
      sendJson(response, 200, requestId, { token: signAdminToken() }, null, headers);
      return;
    }
    if (request.method === "GET" && route === "admin-overview") {
      verifyAdmin(request);
      sendJson(response, 200, requestId, await adminOverview(), null, headers);
      return;
    }
    if (request.method === "POST" && route === "admin-feedback-status") {
      verifyAdmin(request);
      const body = parseJsonObject(request.body);
      const id = uuidValue(body.id, "id");
      if (!["new", "reviewing", "resolved"].includes(body.status)) {
        throw new ApiError(400, "INVALID_REQUEST", "status is invalid.");
      }
      await supabaseRequest(`wendao_feedback?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status: body.status },
        prefer: "return=minimal",
      });
      sendJson(response, 200, requestId, { saved: true }, null, headers);
      return;
    }
    throw new ApiError(404, "INVALID_REQUEST", "Route not found.");
  } catch (error) {
    const safe = error instanceof ApiError
      ? error
      : /Swiss Ephemeris|WASM|ephemeris/i.test(error?.message || "")
        ? new ApiError(503, "ENGINE_UNAVAILABLE", "The calculation engine is temporarily unavailable.")
        : new ApiError(500, "INTERNAL_ERROR", "An internal error occurred.");
    sendJson(response, safe.status, requestId, null, {
      code: safe.code,
      message: safe.message,
    }, headers);
  }
}
