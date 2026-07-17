const HASH_PREFIX = "sha256:";

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
