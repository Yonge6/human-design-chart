export const PROFILE_SCHEMA_VERSION = "1.0";
export const PROFILE_ENGINE_VERSION = "1.0.0";
export const PROFILE_VERIFICATION = Object.freeze({
  CLIENT_ASSERTED: "client_asserted",
  ENGINE_VERIFIED: "engine_verified",
});

export const PROFILE_ENUMS = Object.freeze({
  types: ["Generator", "Manifesting Generator", "Manifestor", "Projector", "Reflector"],
  strategies: ["To Respond", "To Inform", "Wait for the Invitation", "Wait a Lunar Cycle"],
  authorities: [
    "Emotional - Solar Plexus", "Sacral", "Splenic", "Ego Manifested", "Ego Projected",
    "Self-Projected", "Lunar", "Mental - Environment",
  ],
  profiles: ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3"],
  definitions: ["No Definition", "Single Definition", "Split Definition", "Triple Split Definition", "Quadruple Split Definition"],
  centers: ["head", "ajna", "throat", "g", "heart", "sacral", "spleen", "solar plexus", "root"],
});

export const HUMAN_DESIGN_CHANNELS = Object.freeze([
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48], [17, 62],
  [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43], [24, 61], [25, 51],
  [26, 44], [27, 50], [28, 38], [29, 46], [30, 41], [32, 54], [34, 57], [35, 36],
  [37, 40], [39, 55], [42, 53], [47, 64],
]);

const PLANETS = ["sun", "earth", "northNode", "southNode", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const ROOT_FIELDS = ["schemaVersion", "engineVersion", "verificationStatus", "chartHash", "generatedAt", "input", "core", "activations", "structure", "meta"];
const CHANNEL_KEYS = new Set(HUMAN_DESIGN_CHANNELS.map(([a, b]) => `${a}-${b}`));
const HASH_PREFIX = "sha256:";

function exactObject(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === fields.length && keys.every((key) => fields.includes(key));
}

function validInteger(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function validActivation(value) {
  if (!exactObject(value, ["gate", "line", "color", "tone", "base", "longitude"])) return false;
  return validInteger(value.gate, 1, 64)
    && validInteger(value.line, 1, 6)
    && validInteger(value.color, 1, 6)
    && validInteger(value.tone, 1, 6)
    && validInteger(value.base, 1, 5)
    && Number.isFinite(value.longitude)
    && value.longitude >= 0
    && value.longitude < 360;
}

function validActivationSet(value) {
  return exactObject(value, PLANETS) && PLANETS.every((planet) => validActivation(value[planet]));
}

function validChannels(channels) {
  if (!Array.isArray(channels)) return false;
  const seen = new Set();
  for (const channel of channels) {
    if (!Array.isArray(channel) || channel.length !== 2 || !channel.every((gate) => validInteger(gate, 1, 64))) return false;
    const key = `${channel[0]}-${channel[1]}`;
    if (!CHANNEL_KEYS.has(key) || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

export function validateHumanDesignProfileSnapshot(value, options = {}) {
  const allowedVerificationStatuses = options.allowedVerificationStatuses || Object.values(PROFILE_VERIFICATION);
  if (!exactObject(value, ROOT_FIELDS)) return { valid: false, reason: "INVALID_ROOT" };
  if (value.schemaVersion !== PROFILE_SCHEMA_VERSION) return { valid: false, reason: "UNSUPPORTED_SCHEMA_VERSION" };
  if (value.engineVersion !== PROFILE_ENGINE_VERSION) return { valid: false, reason: "UNSUPPORTED_ENGINE_VERSION" };
  if (!allowedVerificationStatuses.includes(value.verificationStatus)) return { valid: false, reason: "INVALID_VERIFICATION_STATUS" };
  if (!/^sha256:[a-f0-9]{64}$/.test(value.chartHash)) return { valid: false, reason: "INVALID_CHART_HASH" };
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) return { valid: false, reason: "INVALID_GENERATED_AT" };
  if (!exactObject(value.input, ["birthDate", "birthTime", "timezone", "locationLabel"])) return { valid: false, reason: "INVALID_INPUT" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.input.birthDate)
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.input.birthTime)
    || typeof value.input.timezone !== "string" || value.input.timezone.length < 1 || value.input.timezone.length > 64
    || typeof value.input.locationLabel !== "string" || value.input.locationLabel.length > 160) return { valid: false, reason: "INVALID_INPUT" };
  if (!exactObject(value.core, ["type", "strategy", "authority", "profile", "definition", "incarnationCross"])) return { valid: false, reason: "INVALID_CORE" };
  if (!PROFILE_ENUMS.types.includes(value.core.type)
    || !PROFILE_ENUMS.strategies.includes(value.core.strategy)
    || !PROFILE_ENUMS.authorities.includes(value.core.authority)
    || !PROFILE_ENUMS.profiles.includes(value.core.profile)
    || !PROFILE_ENUMS.definitions.includes(value.core.definition)
    || typeof value.core.incarnationCross !== "string" || value.core.incarnationCross.length < 1 || value.core.incarnationCross.length > 200) {
    return { valid: false, reason: "INVALID_CORE" };
  }
  if (!exactObject(value.activations, ["personality", "design"])
    || !validActivationSet(value.activations.personality)
    || !validActivationSet(value.activations.design)) return { valid: false, reason: "INVALID_ACTIVATIONS" };
  if (!exactObject(value.structure, ["definedCenters", "channels", "variables"])) return { valid: false, reason: "INVALID_STRUCTURE" };
  if (!Array.isArray(value.structure.definedCenters)
    || new Set(value.structure.definedCenters).size !== value.structure.definedCenters.length
    || !value.structure.definedCenters.every((center) => PROFILE_ENUMS.centers.includes(center))) return { valid: false, reason: "INVALID_CENTERS" };
  if (!validChannels(value.structure.channels)) return { valid: false, reason: "INVALID_CHANNELS" };
  if (!exactObject(value.structure.variables, ["digestion", "environment", "awareness", "perspective"])
    || !Object.values(value.structure.variables).every((direction) => direction === "<" || direction === ">")) return { valid: false, reason: "INVALID_VARIABLES" };
  if (!exactObject(value.meta, ["ephemeris", "nodeType", "designSolarArc", "birthUtc", "designJulianDay"])
    || value.meta.ephemeris !== "Swiss Ephemeris"
    || value.meta.nodeType !== "True Node"
    || value.meta.designSolarArc !== 88
    || typeof value.meta.birthUtc !== "string" || Number.isNaN(Date.parse(value.meta.birthUtc))
    || !Number.isFinite(value.meta.designJulianDay)) return { valid: false, reason: "INVALID_META" };
  return { valid: true, reason: null };
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const fields = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${fields.join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable in this runtime.");
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function chartHashPayload(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    engineVersion: snapshot.engineVersion,
    input: {
      birthDate: snapshot.input.birthDate,
      birthTime: snapshot.input.birthTime,
      timezone: snapshot.input.timezone,
    },
    core: snapshot.core,
    activations: snapshot.activations,
    structure: snapshot.structure,
    meta: {
      ephemeris: snapshot.meta.ephemeris,
      nodeType: snapshot.meta.nodeType,
      designSolarArc: snapshot.meta.designSolarArc,
    },
  };
}

export async function createChartHash(snapshot) {
  return `${HASH_PREFIX}${await sha256(canonicalJson(chartHashPayload(snapshot)))}`;
}
