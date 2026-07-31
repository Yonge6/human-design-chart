import { randomUUID } from "node:crypto";

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
        "Access-Control-Allow-Headers": "Content-Type",
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
