import { createChartHash } from "./chart-hash.js?v=20260718-3";
import { ENGINE_VERSION } from "./human-design-engine.js";
import { PROFILE_SCHEMA_VERSION, PROFILE_VERIFICATION } from "../../shared/human-design-profile-contract.js?v=20260718-3";

export { PROFILE_SCHEMA_VERSION } from "../../shared/human-design-profile-contract.js?v=20260718-3";

const activationNames = {
  Sun: "sun",
  Earth: "earth",
  "North Node": "northNode",
  "South Node": "southNode",
  Moon: "moon",
  Mercury: "mercury",
  Venus: "venus",
  Mars: "mars",
  Jupiter: "jupiter",
  Saturn: "saturn",
  Uranus: "uranus",
  Neptune: "neptune",
  Pluto: "pluto",
};

function normalizeActivation(activation) {
  return {
    gate: activation.Gate,
    line: activation.Line,
    color: activation.Color,
    tone: activation.Tone,
    base: activation.Base,
    longitude: activation.Longitude,
  };
}

function normalizeActivations(side) {
  return Object.fromEntries(Object.entries(activationNames).map(([source, target]) => [
    target,
    normalizeActivation(side[source]),
  ]));
}

function normalizeVariables(variables) {
  return {
    digestion: variables.Digestion,
    environment: variables.Environment,
    awareness: variables.Awareness,
    perspective: variables.Perspective,
  };
}

export async function createHumanDesignProfileSnapshot({
  input,
  result,
  generatedAt = new Date().toISOString(),
  verificationStatus = PROFILE_VERIFICATION.CLIENT_ASSERTED,
}) {
  const snapshot = {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    verificationStatus,
    chartHash: "",
    generatedAt: new Date(generatedAt).toISOString(),
    input: {
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      timezone: input.timezone,
      locationLabel: input.locationLabel || "",
    },
    core: {
      type: result.Properties.Type,
      strategy: result.Properties.Strategy,
      authority: result.Properties["Inner Authority"],
      profile: result.Properties.Profile.split(":", 1)[0],
      definition: result.Properties.Definition,
      incarnationCross: result.Properties["Incarnation Cross"],
    },
    activations: {
      personality: normalizeActivations(result.Personality),
      design: normalizeActivations(result.Design),
    },
    structure: {
      definedCenters: result["Defined Centers"].map((center) => center.replace(/ center$/, "").replace("splenic", "spleen")),
      channels: result.Channels.map((channel) => [...channel]),
      variables: normalizeVariables(result.Variables),
    },
    meta: {
      ephemeris: "Swiss Ephemeris",
      nodeType: "True Node",
      designSolarArc: result.Meta.DesignSolarArc,
      birthUtc: result.Meta.BirthIso,
      designJulianDay: result.Meta.DesignJulianDay,
    },
  };
  snapshot.chartHash = await createChartHash(snapshot);
  return snapshot;
}
