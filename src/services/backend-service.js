import { hasSupabaseConfig, runtimeConfig } from "../config/runtime-config.js";

export const PRODUCT_EVENTS = Object.freeze([
  "app_open", "form_started", "chart_generate_started", "chart_generate_succeeded",
  "chart_generate_failed", "detail_opened", "poster_saved", "share_started",
  "share_completed", "share_cancelled", "language_changed", "privacy_mode_changed",
]);

const EVENT_SET = new Set(PRODUCT_EVENTS);
const FORBIDDEN_EVENT_FIELDS = new Set([
  "name", "birthDate", "birthTime", "location", "locationLabel", "query", "latitude",
  "longitude", "chart", "snapshot", "text", "contacts", "clipboard", "userAgent", "stack",
]);

export const DEFAULT_CONSENT = Object.freeze({ cloudSave: false, productAnalytics: false });

export function sanitizeProductEvent(eventName, properties = {}) {
  if (!EVENT_SET.has(eventName)) throw new TypeError("Unsupported product event.");
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    throw new TypeError("Event properties must be an object.");
  }
  for (const key of Object.keys(properties)) {
    if (FORBIDDEN_EVENT_FIELDS.has(key)) throw new TypeError(`Sensitive event field is not allowed: ${key}`);
    const value = properties[key];
    if (value !== null && !["string", "number", "boolean"].includes(typeof value)) {
      throw new TypeError("Event properties must be flat scalar values.");
    }
  }
  const encoded = JSON.stringify(properties);
  if (encoded.length > 2048) throw new TypeError("Event properties are too large.");
  return { eventName, properties };
}

function baseHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    apikey: runtimeConfig.supabasePublishableKey,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

let sessionPromise;
const SESSION_KEY = "pluto-anonymous-cloud-session-v1";

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function writeSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Private storage may be unavailable. */ }
  return session;
}

async function requestSession(path, body) {
  const response = await fetch(`${runtimeConfig.supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Anonymous cloud session is unavailable.");
  return writeSession(await response.json());
}

async function anonymousSession() {
  if (!hasSupabaseConfig()) return null;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const saved = readSession();
      if (saved?.access_token && Number(saved.expires_at) * 1000 > Date.now() + 60_000) return saved;
      if (saved?.refresh_token) {
        try {
          return await requestSession("token?grant_type=refresh_token", { refresh_token: saved.refresh_token });
        } catch {
          // Create a new anonymous identity only when the saved one cannot be refreshed.
        }
      }
      return requestSession("signup", { data: {} });
    })().catch((error) => {
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

async function invoke(functionName, body) {
  const session = await anonymousSession();
  if (!session?.access_token) throw new Error("Cloud services are not configured.");
  const response = await fetch(`${runtimeConfig.supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: baseHeaders(session.access_token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Cloud request failed (${response.status}).`);
  return response.json();
}

export async function saveChartToCloud(snapshot, personalData, consent = DEFAULT_CONSENT) {
  if (!consent.cloudSave || !hasSupabaseConfig()) return { skipped: true };
  return invoke("save-chart", { snapshot, personalData, consentVersion: "1.0", consent });
}

export async function recordProductEvent(eventName, properties, consent = DEFAULT_CONSENT) {
  if (!consent.productAnalytics || !hasSupabaseConfig()) return { skipped: true };
  return invoke("record-event", {
    ...sanitizeProductEvent(eventName, properties),
    consentVersion: "1.0",
    consent,
  });
}

export async function deleteCloudData(consent = DEFAULT_CONSENT) {
  if (!hasSupabaseConfig()) return { skipped: true };
  return invoke("delete-cloud-data", { consentVersion: "1.0" });
}

export async function updateConsent(consent = DEFAULT_CONSENT) {
  if (!hasSupabaseConfig()) return { skipped: true };
  return invoke("update-consent", {
    consentVersion: "1.0",
    cloudSave: consent.cloudSave === true,
    productAnalytics: consent.productAnalytics === true,
  });
}
