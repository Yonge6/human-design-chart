const PLANETS = ["sun", "earth", "northNode", "southNode", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

function exact(value: unknown, fields: string[]) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value as Record<string, unknown>).length === fields.length
    && Object.keys(value as Record<string, unknown>).every((key) => fields.includes(key));
}

function activation(value: unknown) {
  if (!exact(value, ["gate", "line", "color", "tone", "base", "longitude"])) return false;
  const item = value as Record<string, unknown>;
  return ["gate", "line", "color", "tone", "base", "longitude"].every((key) => typeof item[key] === "number" && Number.isFinite(item[key]));
}

function activationSide(value: unknown) {
  if (!exact(value, PLANETS)) return false;
  return PLANETS.every((planet) => activation((value as Record<string, unknown>)[planet]));
}

export function validProfileSnapshot(value: unknown) {
  if (!exact(value, ["schemaVersion", "engineVersion", "chartHash", "generatedAt", "input", "core", "activations", "structure", "meta"])) return false;
  const snapshot = value as Record<string, any>;
  if (!exact(snapshot.input, ["birthDate", "birthTime", "timezone", "locationLabel"])) return false;
  if (!exact(snapshot.core, ["type", "strategy", "authority", "profile", "definition", "incarnationCross"])) return false;
  if (!exact(snapshot.activations, ["personality", "design"])) return false;
  if (!activationSide(snapshot.activations.personality) || !activationSide(snapshot.activations.design)) return false;
  if (!exact(snapshot.structure, ["definedCenters", "channels", "variables"])) return false;
  if (!Array.isArray(snapshot.structure.definedCenters) || !snapshot.structure.definedCenters.every((item: unknown) => typeof item === "string")) return false;
  if (!Array.isArray(snapshot.structure.channels) || !snapshot.structure.channels.every((item: unknown) => Array.isArray(item) && item.length === 2 && item.every(Number.isFinite))) return false;
  if (!exact(snapshot.structure.variables, ["digestion", "environment", "awareness", "perspective"])) return false;
  if (!Object.values(snapshot.structure.variables).every((item) => typeof item === "string")) return false;
  if (!exact(snapshot.meta, ["ephemeris", "nodeType", "designSolarArc", "birthUtc", "designJulianDay"])) return false;
  return typeof snapshot.schemaVersion === "string"
    && typeof snapshot.engineVersion === "string"
    && typeof snapshot.generatedAt === "string"
    && !Number.isNaN(Date.parse(snapshot.generatedAt))
    && Object.values(snapshot.input).every((item) => typeof item === "string")
    && Object.values(snapshot.core).every((item) => typeof item === "string")
    && typeof snapshot.meta.ephemeris === "string"
    && typeof snapshot.meta.nodeType === "string"
    && Number.isFinite(snapshot.meta.designSolarArc)
    && typeof snapshot.meta.birthUtc === "string"
    && Number.isFinite(snapshot.meta.designJulianDay);
}
