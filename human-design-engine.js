import { SwissEphemeris } from "./vendor/swisseph/swisseph-browser.js?v=20260712-3";
import { getIncarnationCross } from "./vendor/natalengine/incarnation-crosses.js?v=20260712-3";

const Planet = {
  Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5,
  Saturn: 6, Uranus: 7, Neptune: 8, Pluto: 9, TrueNode: 11,
};
const SWISS_EPHEMERIS_FLAGS = 258;
const EPHEMERIS_FILES = ["sepl_18.se1", "semo_18.se1", "seas_18.se1"];

const GATE_ORDER = [
  25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12,
  15, 52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6,
  46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11,
  10, 58, 38, 54, 61, 60, 41, 19, 13, 49, 30, 55, 37, 63, 22, 36,
];

const PLANETS = [
  ["Moon", Planet.Moon],
  ["Mercury", Planet.Mercury],
  ["Venus", Planet.Venus],
  ["Mars", Planet.Mars],
  ["Jupiter", Planet.Jupiter],
  ["Saturn", Planet.Saturn],
  ["Uranus", Planet.Uranus],
  ["Neptune", Planet.Neptune],
  ["Pluto", Planet.Pluto],
];

const CHANNELS = [
  [[1, 8], ["g", "throat"]], [[2, 14], ["g", "sacral"]],
  [[3, 60], ["sacral", "root"]], [[4, 63], ["ajna", "head"]],
  [[5, 15], ["sacral", "g"]], [[6, 59], ["solar", "sacral"]],
  [[7, 31], ["g", "throat"]], [[9, 52], ["sacral", "root"]],
  [[10, 20], ["g", "throat"]], [[10, 34], ["g", "sacral"]],
  [[10, 57], ["g", "spleen"]], [[11, 56], ["ajna", "throat"]],
  [[12, 22], ["throat", "solar"]], [[13, 33], ["g", "throat"]],
  [[16, 48], ["throat", "spleen"]], [[17, 62], ["ajna", "throat"]],
  [[18, 58], ["spleen", "root"]], [[19, 49], ["root", "solar"]],
  [[20, 34], ["throat", "sacral"]], [[20, 57], ["throat", "spleen"]],
  [[21, 45], ["heart", "throat"]], [[23, 43], ["throat", "ajna"]],
  [[24, 61], ["ajna", "head"]], [[25, 51], ["g", "heart"]],
  [[26, 44], ["heart", "spleen"]], [[27, 50], ["sacral", "spleen"]],
  [[28, 38], ["spleen", "root"]], [[29, 46], ["sacral", "g"]],
  [[30, 41], ["solar", "root"]], [[32, 54], ["spleen", "root"]],
  [[34, 57], ["sacral", "spleen"]], [[35, 36], ["throat", "solar"]],
  [[37, 40], ["solar", "heart"]], [[39, 55], ["root", "solar"]],
  [[42, 53], ["sacral", "root"]], [[47, 64], ["ajna", "head"]],
];

const CENTER_LABELS = {
  head: "head center",
  ajna: "ajna center",
  throat: "throat center",
  g: "g center",
  heart: "heart center",
  sacral: "sacral center",
  spleen: "splenic center",
  solar: "solar plexus center",
  root: "root center",
};

const PROFILE_NAMES = {
  "1/3": "Investigator / Martyr", "1/4": "Investigator / Opportunist",
  "2/4": "Hermit / Opportunist", "2/5": "Hermit / Heretic",
  "3/5": "Martyr / Heretic", "3/6": "Martyr / Role Model",
  "4/6": "Opportunist / Role Model", "4/1": "Opportunist / Investigator",
  "5/1": "Heretic / Investigator", "5/2": "Heretic / Hermit",
  "6/2": "Role Model / Hermit", "6/3": "Role Model / Martyr",
};

const TYPE_META = {
  Generator: { strategy: "To Respond", sign: "Satisfaction", notSelf: "Frustration" },
  "Manifesting Generator": { strategy: "To Respond", sign: "Satisfaction", notSelf: "Frustration" },
  Manifestor: { strategy: "To Inform", sign: "Peace", notSelf: "Anger" },
  Projector: { strategy: "Wait for the Invitation", sign: "Success", notSelf: "Bitterness" },
  Reflector: { strategy: "Wait a Lunar Cycle", sign: "Surprise", notSelf: "Disappointment" },
};

const DETERMINATION = {
  1: ["Consecutive Appetite", "Alternating Appetite"],
  2: ["Open Taste", "Closed Taste"],
  3: ["Hot Thirst", "Cold Thirst"],
  4: ["Calm Touch", "Nervous Touch"],
  5: ["High Sound", "Low Sound"],
  6: ["Direct Light", "Indirect Light"],
};
const COGNITION = { 1: "Smell", 2: "Taste", 3: "Outer Vision", 4: "Inner Vision", 5: "Feeling", 6: "Touch" };
const ENVIRONMENT = { 1: "Caves", 2: "Markets", 3: "Kitchens", 4: "Mountains", 5: "Valleys", 6: "Shores" };

let swePromise;

async function getSwissEphemeris() {
  if (!swePromise) {
    swePromise = (async () => {
      const swe = new SwissEphemeris();
      await swe.init(new URL("./vendor/swisseph/swisseph.wasm", import.meta.url).href);
      await swe.loadEphemerisFiles(EPHEMERIS_FILES.map((name) => ({
        name,
        url: new URL(`./vendor/swisseph/ephe/${name}`, import.meta.url).href,
      })));
      return swe;
    })();
  }
  try {
    return await swePromise;
  } catch (error) {
    swePromise = undefined;
    throw error;
  }
}

function normalize(longitude) {
  return ((longitude % 360) + 360) % 360;
}

function signedAngle(a, b) {
  return ((a - b + 540) % 360) - 180;
}

function longitudeToActivation(longitude) {
  const adjusted = normalize(longitude - 358.25);
  let within = adjusted % 5.625;
  const activation = {
    Gate: GATE_ORDER[Math.floor(adjusted / 5.625)],
    Line: Math.floor(within / 0.9375) + 1,
  };
  within %= 0.9375;
  activation.Color = Math.floor(within / 0.15625) + 1;
  within %= 0.15625;
  activation.Tone = Math.floor(within / (0.15625 / 6)) + 1;
  within %= 0.15625 / 6;
  activation.Base = Math.min(5, Math.floor(within / (0.15625 / 30)) + 1);
  activation.Longitude = normalize(longitude);
  return activation;
}

function position(swe, jd, planet) {
  const result = swe.calculatePosition(jd, planet, SWISS_EPHEMERIS_FLAGS);
  if ((result.flags & 2) !== 2) throw new Error("Swiss Ephemeris data files were not loaded.");
  return result.longitude;
}

function calculateSide(swe, jd) {
  const sun = position(swe, jd, Planet.Sun);
  const node = position(swe, jd, Planet.TrueNode);
  const result = {
    Sun: longitudeToActivation(sun),
    Earth: longitudeToActivation(sun + 180),
    "North Node": longitudeToActivation(node),
    "South Node": longitudeToActivation(node + 180),
  };
  for (const [name, planet] of PLANETS) result[name] = longitudeToActivation(position(swe, jd, planet));
  return result;
}

function findDesignJulianDay(swe, birthJd) {
  const target = normalize(position(swe, birthJd, Planet.Sun) - 88);
  let low = birthJd - 100;
  let high = birthJd - 70;
  for (let i = 0; i < 64; i += 1) {
    const mid = (low + high) / 2;
    if (signedAngle(position(swe, mid, Planet.Sun), target) < 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function activeGateSet(personality, design) {
  return new Set([...Object.values(personality), ...Object.values(design)].map((item) => item.Gate));
}

function activeChannels(gates) {
  return CHANNELS.filter(([[a, b]]) => gates.has(a) && gates.has(b));
}

function definedCenters(channels) {
  const centers = new Set();
  channels.forEach(([, pair]) => pair.forEach((center) => centers.add(center)));
  return centers;
}

function centerGraph(channels, centers) {
  const graph = new Map([...centers].map((center) => [center, new Set()]));
  channels.forEach(([, [a, b]]) => {
    graph.get(a)?.add(b);
    graph.get(b)?.add(a);
  });
  return graph;
}

function hasMotorToThroat(channels, centers) {
  if (!centers.has("throat")) return false;
  const graph = centerGraph(channels, centers);
  const motors = new Set(["sacral", "heart", "solar", "root"]);
  const queue = ["throat"];
  const visited = new Set(queue);
  while (queue.length) {
    const center = queue.shift();
    if (motors.has(center)) return true;
    for (const next of graph.get(center) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

function getType(channels, centers) {
  if (centers.size === 0) return "Reflector";
  const motorToThroat = hasMotorToThroat(channels, centers);
  if (centers.has("sacral")) return motorToThroat ? "Manifesting Generator" : "Generator";
  return motorToThroat ? "Manifestor" : "Projector";
}

function hasChannel(channels, first, second) {
  return channels.some(([[a, b]]) => (a === first && b === second) || (a === second && b === first));
}

function getAuthority(centers, channels) {
  if (centers.has("solar")) return "Emotional - Solar Plexus";
  if (centers.has("sacral")) return "Sacral";
  if (centers.has("spleen")) return "Splenic";
  if (centers.has("heart")) return hasChannel(channels, 21, 45) ? "Ego Manifested" : "Ego Projected";
  if (centers.has("g")) return "Self-Projected";
  if (centers.size === 0) return "Lunar";
  return "Mental - Environment";
}

function getDefinition(channels, centers) {
  if (!centers.size) return "No Definition";
  const graph = centerGraph(channels, centers);
  const visited = new Set();
  let components = 0;
  for (const start of centers) {
    if (visited.has(start)) continue;
    components += 1;
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      for (const next of graph.get(queue.shift()) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  return ["No Definition", "Single Definition", "Split Definition", "Triple Split Definition", "Quadruple Split Definition"][components];
}

function timezoneOffsetAt(utcMs, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - utcMs;
}

function localToUtcCandidates(year, month, day, hour, minute, timezone) {
  const wallTime = Date.UTC(year, month - 1, day, hour, minute);
  const normalized = new Date(wallTime);
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() + 1 !== month
    || normalized.getUTCDate() !== day
    || normalized.getUTCHours() !== hour
    || normalized.getUTCMinutes() !== minute
  ) {
    throw new RangeError("Invalid birth date or time.");
  }

  const offsets = new Set([-2, -1, 0, 1, 2].map((days) => timezoneOffsetAt(wallTime + days * 86400000, timezone)));
  const candidates = [...offsets]
    .map((offset) => wallTime - offset)
    .filter((utcMs) => {
      const local = new Date(utcMs + timezoneOffsetAt(utcMs, timezone));
      return local.getUTCFullYear() === year
        && local.getUTCMonth() + 1 === month
        && local.getUTCDate() === day
        && local.getUTCHours() === hour
        && local.getUTCMinutes() === minute;
    })
    .filter((utcMs, index, values) => values.indexOf(utcMs) === index)
    .sort((a, b) => a - b);

  return candidates;
}

function localToUtcMs(year, month, day, hour, minute, timezone, disambiguation = "earlier") {
  const candidates = localToUtcCandidates(year, month, day, hour, minute, timezone);
  if (!candidates.length) throw new RangeError("This local birth time did not exist because the clocks moved forward.");
  return disambiguation === "later" ? candidates[candidates.length - 1] : candidates[0];
}

function ordinal(day) {
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix}`;
}

function displayDate(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${ordinal(Number(values.day))} ${values.month} ${values.year} @ ${values.hour}:${values.minute}`;
}

export async function calculateHumanDesign({ name, location, year, month, day, hour, minute, timezone, timeDisambiguation }) {
  const swe = await getSwissEphemeris();
  const utcMs = localToUtcMs(year, month, day, hour, minute, timezone, timeDisambiguation);
  const birthDate = new Date(utcMs);
  const birthJd = swe.dateToJulianDay(birthDate);
  const designJd = findDesignJulianDay(swe, birthJd);
  const designDate = swe.julianDayToDate(designJd);
  const personality = calculateSide(swe, birthJd);
  const design = calculateSide(swe, designJd);
  const gates = activeGateSet(personality, design);
  const channels = activeChannels(gates);
  const centers = definedCenters(channels);
  const type = getType(channels, centers);
  const profile = `${personality.Sun.Line}/${design.Sun.Line}`;
  const crossGates = [personality.Sun.Gate, personality.Earth.Gate, design.Sun.Gate, design.Earth.Gate];
  const cross = getIncarnationCross(personality.Sun.Gate, profile, crossGates);
  const leftDetermination = design.Sun.Tone <= 3;
  const leftEnvironment = design["North Node"].Tone <= 3;
  const leftAwareness = personality.Sun.Tone <= 3;
  const leftPerspective = personality["North Node"].Tone <= 3;

  return {
    Properties: {
      Name: name,
      Location: location,
      BirthDateLocal: displayDate(birthDate, timezone),
      BirthDateUtc: displayDate(birthDate, "UTC"),
      DesignDateUtc: displayDate(designDate, "UTC"),
      Type: type,
      Strategy: TYPE_META[type].strategy,
      Sign: TYPE_META[type].sign,
      "Inner Authority": getAuthority(centers, channels),
      Definition: getDefinition(channels, centers),
      Profile: `${profile}: ${PROFILE_NAMES[profile] || "Profile"}`,
      "Incarnation Cross": cross.fullName,
      "Not Self Theme": TYPE_META[type].notSelf,
      Digestion: DETERMINATION[design.Sun.Color][leftDetermination ? 0 : 1],
      Sense: COGNITION[design.Sun.Tone],
      Environment: ENVIRONMENT[design["North Node"].Color],
    },
    Personality: personality,
    Design: design,
    "Defined Centers": [...centers].map((center) => CENTER_LABELS[center]),
    Channels: channels.map(([[a, b]]) => [a, b]),
    Variables: {
      Digestion: leftDetermination ? "<" : ">",
      Environment: leftEnvironment ? "<" : ">",
      Awareness: leftAwareness ? "<" : ">",
      Perspective: leftPerspective ? "<" : ">",
    },
    Meta: {
      Ephemeris: "Swiss Ephemeris WASM (SE1 data files)",
      DesignSolarArc: 88,
      Timezone: timezone,
      BirthIso: birthDate.toISOString(),
      BirthJulianDay: birthJd,
      DesignJulianDay: designJd,
    },
  };
}

export { GATE_ORDER, CHANNELS, getAuthority, localToUtcCandidates, localToUtcMs, longitudeToActivation };
