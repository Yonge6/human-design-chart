import { PROFILE_ENGINE_VERSION, PROFILE_SCHEMA_VERSION } from "./human-design-profile-contract.js";

export const PRODUCT_EVENT_NAMES = Object.freeze([
  "app_open", "form_started", "chart_generate_started", "chart_generate_succeeded",
  "chart_generate_failed", "detail_opened", "poster_saved", "share_started",
  "share_completed", "share_cancelled", "language_changed", "privacy_mode_changed",
]);

const EVENT_NAMES = new Set(PRODUCT_EVENT_NAMES);
const STRING_ENUMS = Object.freeze({
  language: ["zh", "en"],
  environment: ["production", "development", "test"],
  platform: ["web", "ios", "android", "unknown"],
  surface: ["form", "result", "detail", "settings", "history"],
  format: ["image", "link", "native_share", "download"],
  category: ["validation", "calculation", "network", "engine", "cancelled"],
  setting: ["privacyMode", "cloudSave", "productAnalytics", "localHistory"],
  schemaVersion: [PROFILE_SCHEMA_VERSION],
  engineVersion: [PROFILE_ENGINE_VERSION],
});
const PROPERTY_KEYS = new Set([...Object.keys(STRING_ENUMS), "enabled"]);

export function validateProductEvent(eventName, properties) {
  if (!EVENT_NAMES.has(eventName)) return { valid: false, reason: "INVALID_EVENT_NAME" };
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return { valid: false, reason: "INVALID_EVENT_PROPERTIES" };
  if (new TextEncoder().encode(JSON.stringify(properties)).byteLength > 2048) return { valid: false, reason: "EVENT_PROPERTIES_TOO_LARGE" };
  for (const [key, value] of Object.entries(properties)) {
    if (!PROPERTY_KEYS.has(key)) return { valid: false, reason: "UNSUPPORTED_EVENT_FIELD" };
    if (key === "enabled") {
      if (typeof value !== "boolean") return { valid: false, reason: "INVALID_EVENT_VALUE" };
      continue;
    }
    if (typeof value !== "string" || value.length > 64 || !STRING_ENUMS[key].includes(value)) {
      return { valid: false, reason: "INVALID_EVENT_VALUE" };
    }
  }
  return { valid: true, reason: null };
}
