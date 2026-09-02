const centerDefinitions = [
  { key: "head", id: "head-center", name: "Head", shortLabel: "HEAD", gates: [61, 63, 64] },
  { key: "ajna", id: "ajna-center", name: "Ajna", shortLabel: "AJNA", gates: [4, 11, 17, 24, 43, 47] },
  { key: "throat", id: "throat-center", name: "Throat", shortLabel: "THROAT", gates: [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62] },
  { key: "g", id: "g-center", name: "G", shortLabel: "G", gates: [1, 2, 7, 10, 13, 15, 25, 46] },
  { key: "heart", id: "heart-center", name: "Heart", shortLabel: "HEART", gates: [21, 26, 40, 51] },
  { key: "spleen", id: "splenic-center", name: "Spleen", shortLabel: "SPLEEN", gates: [18, 28, 32, 44, 48, 50, 57] },
  { key: "solar-plexus", id: "solar-plexus-center", name: "Solar Plexus", shortLabel: "SOLAR", gates: [6, 22, 30, 36, 37, 49, 55] },
  { key: "sacral", id: "sacral-center", name: "Sacral", shortLabel: "SACRAL", gates: [3, 5, 9, 14, 27, 29, 34, 42, 59] },
  { key: "root", id: "root-center", name: "Root", shortLabel: "ROOT", gates: [19, 38, 39, 41, 52, 53, 54, 58, 60] },
];

const channelPairs = [
  [1, 8],
  [2, 14],
  [3, 60],
  [4, 63],
  [5, 15],
  [6, 59],
  [7, 31],
  [9, 52],
  [10, 20],
  [10, 34],
  [10, 57],
  [11, 56],
  [12, 22],
  [13, 33],
  [16, 48],
  [17, 62],
  [18, 58],
  [19, 49],
  [20, 34],
  [20, 57],
  [21, 45],
  [23, 43],
  [24, 61],
  [25, 51],
  [26, 44],
  [27, 50],
  [28, 38],
  [29, 46],
  [30, 41],
  [32, 54],
  [34, 57],
  [35, 36],
  [37, 40],
  [39, 55],
  [42, 53],
  [47, 64],
];

export const BODYGRAPH_CENTERS = Object.freeze(
  centerDefinitions.map((center) => Object.freeze({
    ...center,
    gates: Object.freeze([...center.gates]),
  })),
);

export const BODYGRAPH_CHANNELS = Object.freeze(
  channelPairs.map(([firstGate, secondGate]) => Object.freeze({
    id: `${firstGate}-${secondGate}`,
    gates: Object.freeze([firstGate, secondGate]),
  })),
);

export const BODYGRAPH_GATE_TO_CENTER = Object.freeze(Object.fromEntries(
  BODYGRAPH_CENTERS.flatMap((center) => center.gates.map((gate) => [gate, center.key])),
));

export function getGatePeers(gate) {
  return BODYGRAPH_CHANNELS
    .filter((channel) => channel.gates.includes(gate))
    .map((channel) => channel.gates[0] === gate ? channel.gates[1] : channel.gates[0])
    .sort((a, b) => a - b);
}

export function validateBodygraphTopology() {
  const ownership = new Map();
  for (const center of BODYGRAPH_CENTERS) {
    for (const gate of center.gates) {
      if (!Number.isInteger(gate) || gate < 1 || gate > 64) {
        throw new Error(`Invalid gate ${gate} in ${center.key}.`);
      }
      if (ownership.has(gate)) {
        throw new Error(`Gate ${gate} belongs to more than one center.`);
      }
      ownership.set(gate, center.key);
    }
  }

  const missingGates = Array.from({ length: 64 }, (_, index) => index + 1)
    .filter((gate) => !ownership.has(gate));
  if (missingGates.length) {
    throw new Error(`Gate ownership is incomplete: ${missingGates.join(", ")}.`);
  }

  const channelIds = new Set();
  for (const channel of BODYGRAPH_CHANNELS) {
    if (channel.gates.length !== 2 || channel.gates[0] === channel.gates[1]) {
      throw new Error(`Channel ${channel.id} must have two distinct endpoints.`);
    }
    if (channelIds.has(channel.id)) {
      throw new Error(`Duplicate channel ${channel.id}.`);
    }
    channelIds.add(channel.id);
    for (const gate of channel.gates) {
      if (!ownership.has(gate)) {
        throw new Error(`Channel ${channel.id} references unknown gate ${gate}.`);
      }
    }
  }

  for (const gate of ownership.keys()) {
    if (!getGatePeers(gate).length) {
      throw new Error(`Gate ${gate} is not connected to a channel.`);
    }
  }

  return {
    centers: BODYGRAPH_CENTERS.length,
    gates: ownership.size,
    channels: BODYGRAPH_CHANNELS.length,
  };
}

validateBodygraphTopology();
