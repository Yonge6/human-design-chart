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

const SHA256_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value, shift) {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256Fallback(value) {
  const bytes = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const paddedView = new DataView(padded.buffer);
  paddedView.setUint32(paddedLength - 8, Math.floor(bytes.length / 0x20000000));
  paddedView.setUint32(paddedLength - 4, (bytes.length * 8) >>> 0);

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = paddedView.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) return sha256Fallback(value);
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
