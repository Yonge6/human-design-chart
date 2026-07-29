import {
  BODYGRAPH_CENTERS,
  BODYGRAPH_CHANNELS,
  BODYGRAPH_GATE_TO_CENTER,
  getGatePeers,
  validateBodygraphTopology,
} from "./bodygraph-functional-topology.js";

export const BODYGRAPH_VIEWBOX = Object.freeze({
  width: 360,
  height: 696,
  safeMarginX: 20,
  safeMarginTop: 22,
  safeMarginBottom: 26,
});

const centerShapeDefinitions = {
  head: { width: 66, height: 44, vertices: 8, radius: 8, rotation: 0 },
  ajna: { width: 76, height: 48, vertices: 8, radius: 9, rotation: 0 },
  throat: { width: 88, height: 58, vertices: 10, radius: 10, rotation: 0 },
  g: { width: 76, height: 76, vertices: 12, radius: 11, rotation: 0 },
  heart: { width: 56, height: 44, vertices: 8, radius: 8, rotation: -8 },
  spleen: { width: 62, height: 96, vertices: 10, radius: 10, rotation: 7 },
  "solar-plexus": { width: 66, height: 104, vertices: 10, radius: 11, rotation: -6 },
  sacral: { width: 86, height: 68, vertices: 10, radius: 11, rotation: 0 },
  root: { width: 90, height: 58, vertices: 10, radius: 10, rotation: 0 },
};

const centerAnchorFormulas = {
  head: ({ cx, top }) => ({ x: cx, y: top }),
  ajna: ({ cx, top, span }) => ({ x: cx, y: top + span * 0.12 }),
  throat: ({ cx, top, span }) => ({ x: cx, y: top + span * 0.265 }),
  g: ({ cx, top, span }) => ({ x: cx, y: top + span * 0.405 }),
  heart: ({ cx, top, span }) => ({ x: cx + 62, y: top + span * 0.43 }),
  spleen: ({ cx, top, span }) => ({ x: cx - 68, y: top + span * 0.555 }),
  "solar-plexus": ({ cx, top, span }) => ({ x: cx + 70, y: top + span * 0.575 }),
  sacral: ({ cx, top, span }) => ({ x: cx, y: top + span * 0.68 }),
  root: ({ cx, bottom }) => ({ x: cx, y: bottom }),
};

const round = (value) => Number(value.toFixed(3));
const point = (x, y) => ({ x: round(x), y: round(y) });
const add = (a, b) => point(a.x + b.x, a.y + b.y);
const subtract = (a, b) => point(a.x - b.x, a.y - b.y);
const scale = (value, amount) => point(value.x * amount, value.y * amount);
const length = (value) => Math.hypot(value.x, value.y);
const normalize = (value) => {
  const magnitude = length(value);
  return magnitude ? point(value.x / magnitude, value.y / magnitude) : point(0, -1);
};
const perpendicular = (value) => point(-value.y, value.x);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function rotatePoint(value, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return point(
    value.x * cosine - value.y * sine,
    value.x * sine + value.y * cosine,
  );
}

export function createCenterAnchors(width = BODYGRAPH_VIEWBOX.width, height = BODYGRAPH_VIEWBOX.height) {
  const top = height * (54 / 696);
  const bottom = height * (626 / 696);
  const values = {
    cx: width / 2,
    top,
    bottom,
    span: bottom - top,
  };

  return Object.freeze(Object.fromEntries(BODYGRAPH_CENTERS.map((center) => {
    const anchor = centerAnchorFormulas[center.key](values);
    return [center.key, Object.freeze(point(anchor.x, anchor.y))];
  })));
}

function facetedPoint(center, angle, inset = 0, extra = 0) {
  const exponent = 3.2;
  const radiusX = Math.max(2, center.width / 2 - inset + extra);
  const radiusY = Math.max(2, center.height / 2 - inset + extra);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const local = {
    x: Math.sign(cosine) * Math.pow(Math.abs(cosine), 2 / exponent) * radiusX,
    y: Math.sign(sine) * Math.pow(Math.abs(sine), 2 / exponent) * radiusY,
  };
  const rotated = rotatePoint(local, center.rotation * Math.PI / 180);
  return point(center.x + rotated.x, center.y + rotated.y);
}

function roundedPolygonPath(vertices, radius) {
  const corners = vertices.map((current, index) => {
    const previous = vertices[(index - 1 + vertices.length) % vertices.length];
    const next = vertices[(index + 1) % vertices.length];
    const incoming = normalize(subtract(previous, current));
    const outgoing = normalize(subtract(next, current));
    const cornerRadius = Math.min(
      radius,
      length(subtract(previous, current)) / 3,
      length(subtract(next, current)) / 3,
    );
    return {
      current,
      entry: add(current, scale(incoming, cornerRadius)),
      exit: add(current, scale(outgoing, cornerRadius)),
    };
  });

  const commands = [`M ${corners[0].entry.x} ${corners[0].entry.y}`];
  for (const corner of corners) {
    commands.push(`Q ${corner.current.x} ${corner.current.y} ${corner.exit.x} ${corner.exit.y}`);
    const nextCorner = corners[(corners.indexOf(corner) + 1) % corners.length];
    commands.push(`L ${nextCorner.entry.x} ${nextCorner.entry.y}`);
  }
  commands.push("Z");
  return commands.join(" ");
}

function createCenterGeometry(anchors) {
  return BODYGRAPH_CENTERS.map((definition) => {
    const anchor = anchors[definition.key];
    const shape = centerShapeDefinitions[definition.key];
    const center = {
      ...definition,
      ...shape,
      x: anchor.x,
      y: anchor.y,
    };
    const vertices = Array.from({ length: center.vertices }, (_, index) => (
      facetedPoint(center, -Math.PI / 2 + index * (Math.PI * 2 / center.vertices))
    ));
    const innerVertices = Array.from({ length: center.vertices }, (_, index) => (
      facetedPoint(center, -Math.PI / 2 + index * (Math.PI * 2 / center.vertices), 7)
    ));
    const notchAngle = center.x < BODYGRAPH_VIEWBOX.width / 2
      ? 0
      : center.x > BODYGRAPH_VIEWBOX.width / 2
        ? Math.PI
        : -Math.PI / 2;
    const notch = facetedPoint(center, notchAngle, 2);

    return Object.freeze({
      ...center,
      path: roundedPolygonPath(vertices, center.radius),
      innerPath: roundedPolygonPath(innerVertices, Math.max(4, center.radius - 3)),
      notch: Object.freeze(notch),
      bounds: Object.freeze({
        left: round(center.x - center.width / 2),
        right: round(center.x + center.width / 2),
        top: round(center.y - center.height / 2),
        bottom: round(center.y + center.height / 2),
      }),
    });
  });
}

function preferredGateDirection(gate, centerByKey, anchors) {
  const owningCenter = centerByKey.get(BODYGRAPH_GATE_TO_CENTER[gate]);
  const peerCenters = getGatePeers(gate)
    .map((peer) => centerByKey.get(BODYGRAPH_GATE_TO_CENTER[peer]))
    .filter((center) => center && center.key !== owningCenter.key);
  const vectors = peerCenters.map((peer) => normalize(subtract(anchors[peer.key], anchors[owningCenter.key])));
  const combined = vectors.reduce((total, value) => add(total, value), point(0, 0));
  const direction = length(combined) > 0.01 ? normalize(combined) : vectors[0] || point(0, -1);
  const peerLayer = peerCenters.length
    ? Math.min(...peerCenters.map((center) => anchors[center.key].y))
    : owningCenter.y;
  return {
    angle: Math.atan2(direction.y, direction.x),
    peerLayer,
  };
}

function approximateEllipsePerimeter(radiusX, radiusY) {
  return Math.PI * (
    3 * (radiusX + radiusY)
    - Math.sqrt((3 * radiusX + radiusY) * (radiusX + 3 * radiusY))
  );
}

function chooseAvailableSlot(preferredSlot, slotCount, usedSlots, center, assignedPositions) {
  for (let distance = 0; distance < slotCount; distance += 1) {
    const candidates = distance === 0
      ? [preferredSlot]
      : [
          (preferredSlot + distance) % slotCount,
          (preferredSlot - distance + slotCount) % slotCount,
        ];
    for (const candidate of candidates) {
      if (usedSlots.has(candidate)) continue;
      const angle = candidate / slotCount * Math.PI * 2;
      const position = facetedPoint(center, angle, 0, 11);
      const hasClearance = assignedPositions.every((assigned) => (
        length(subtract(position, assigned)) >= 13
      ));
      if (hasClearance) return { slot: candidate, position };
    }
  }
  throw new Error("No gate slot is available.");
}

function createGateGeometry(centers, anchors) {
  const centerByKey = new Map(centers.map((center) => [center.key, center]));
  const gates = [];

  for (const center of centers) {
    const radiusX = center.width / 2 + 11;
    const radiusY = center.height / 2 + 11;
    const perimeter = approximateEllipsePerimeter(radiusX, radiusY);
    const slotCount = Math.max(48, Math.ceil(perimeter / 4));
    const usedSlots = new Set();
    const assignedPositions = [];
    const orderedGates = center.gates
      .map((gate) => ({ gate, ...preferredGateDirection(gate, centerByKey, anchors) }))
      .sort((a, b) => {
        const sectorA = Math.round((a.angle + Math.PI) / (Math.PI / 4));
        const sectorB = Math.round((b.angle + Math.PI) / (Math.PI / 4));
        return sectorA - sectorB || a.peerLayer - b.peerLayer || a.gate - b.gate;
      });

    for (const gateData of orderedGates) {
      const normalizedAngle = (gateData.angle + Math.PI * 2) % (Math.PI * 2);
      const preferredSlot = Math.round(normalizedAngle / (Math.PI * 2) * slotCount) % slotCount;
      const { slot, position } = chooseAvailableSlot(
        preferredSlot,
        slotCount,
        usedSlots,
        center,
        assignedPositions,
      );
      usedSlots.add(slot);
      assignedPositions.push(position);
      const slotAngle = slot / slotCount * Math.PI * 2;
      const direction = normalize(subtract(position, point(center.x, center.y)));

      gates.push(Object.freeze({
        gate: gateData.gate,
        center: center.key,
        x: position.x,
        y: position.y,
        direction: Object.freeze(direction),
        sector: Math.round((slotAngle + Math.PI) / (Math.PI / 4)) % 8,
        slot,
      }));
    }
  }

  return gates.sort((a, b) => a.gate - b.gate);
}

function cubicPoint(route, amount) {
  const inverse = 1 - amount;
  return point(
    inverse ** 3 * route.p1.x
      + 3 * inverse ** 2 * amount * route.c1.x
      + 3 * inverse * amount ** 2 * route.c2.x
      + amount ** 3 * route.p2.x,
    inverse ** 3 * route.p1.y
      + 3 * inverse ** 2 * amount * route.c1.y
      + 3 * inverse * amount ** 2 * route.c2.y
      + amount ** 3 * route.p2.y,
  );
}

function routeIntersectsCenter(route, center, clearance = 10) {
  for (let step = 2; step <= 8; step += 1) {
    const sample = cubicPoint(route, step / 10);
    if (
      sample.x >= center.bounds.left - clearance
      && sample.x <= center.bounds.right + clearance
      && sample.y >= center.bounds.top - clearance
      && sample.y <= center.bounds.bottom + clearance
    ) {
      return true;
    }
  }
  return false;
}

function channelCenterPair(channel) {
  return channel.gates
    .map((gate) => BODYGRAPH_GATE_TO_CENTER[gate])
    .sort()
    .join(":");
}

function createRoute(channel, gateByNumber, centerByKey, laneOffset) {
  const rawP1 = gateByNumber.get(channel.gates[0]);
  const rawP2 = gateByNumber.get(channel.gates[1]);
  const direction = normalize(subtract(rawP2, rawP1));
  const normal = perpendicular(direction);
  const p1 = add(rawP1, scale(direction, 7.5));
  const p2 = add(rawP2, scale(direction, -7.5));
  const segmentLength = length(subtract(p2, p1));
  const controlDistance = clamp(segmentLength * 0.32, 28, 72);
  const firstCenter = centerByKey.get(BODYGRAPH_GATE_TO_CENTER[channel.gates[0]]);
  const secondCenter = centerByKey.get(BODYGRAPH_GATE_TO_CENTER[channel.gates[1]]);
  const nearVertical = Math.abs(p2.x - p1.x) < 28;
  const lowerLink = [firstCenter.key, secondCenter.key].includes("root");
  let routeType = "side";
  let c1 = add(p1, scale(direction, controlDistance));
  let c2 = add(p2, scale(direction, -controlDistance));

  if (lowerLink) {
    routeType = "lower-s";
    c1 = add(c1, scale(normal, 12 + laneOffset));
    c2 = add(c2, scale(normal, -12 + laneOffset));
  } else if (nearVertical) {
    routeType = "vertical";
    c1 = add(c1, scale(normal, laneOffset));
    c2 = add(c2, scale(normal, laneOffset));
  } else {
    const midpointX = (p1.x + p2.x) / 2;
    const awayFromAxis = midpointX >= BODYGRAPH_VIEWBOX.width / 2 ? 1 : -1;
    const bow = point(awayFromAxis * 14, 0);
    c1 = add(add(c1, bow), scale(normal, laneOffset));
    c2 = add(add(c2, bow), scale(normal, laneOffset));
  }

  let route = { p1, c1, c2, p2 };
  const obstacle = [...centerByKey.values()].find((center) => (
    center.key !== firstCenter.key
    && center.key !== secondCenter.key
    && routeIntersectsCenter(route, center)
  ));
  if (obstacle) {
    const midpointX = (p1.x + p2.x) / 2;
    const detourDirection = midpointX <= obstacle.x ? -1 : 1;
    const detour = point(detourDirection * (obstacle.width / 2 + 14), 0);
    route = {
      ...route,
      c1: add(route.c1, detour),
      c2: add(route.c2, detour),
    };
    routeType = `${routeType}-detour`;
  }

  return Object.freeze({
    id: channel.id,
    gates: channel.gates,
    routeType,
    p1: Object.freeze(route.p1),
    c1: Object.freeze(route.c1),
    c2: Object.freeze(route.c2),
    p2: Object.freeze(route.p2),
    normal: Object.freeze(normal),
  });
}

function createChannelGeometry(channels, gates, centers) {
  const gateByNumber = new Map(gates.map((gate) => [gate.gate, gate]));
  const centerByKey = new Map(centers.map((center) => [center.key, center]));
  const groups = new Map();
  for (const channel of channels) {
    const key = channelCenterPair(channel);
    const values = groups.get(key) || [];
    values.push(channel);
    groups.set(key, values);
  }

  return channels.map((channel) => {
    const siblings = groups.get(channelCenterPair(channel));
    const siblingIndex = siblings.findIndex((candidate) => candidate.id === channel.id);
    const laneOffset = (siblingIndex - (siblings.length - 1) / 2) * 6;
    return createRoute(channel, gateByNumber, centerByKey, laneOffset);
  });
}

export function offsetRoute(route, amount) {
  const offset = scale(route.normal, amount);
  return {
    ...route,
    p1: add(route.p1, offset),
    c1: add(route.c1, offset),
    c2: add(route.c2, offset),
    p2: add(route.p2, offset),
  };
}

export function routeToPath(route) {
  return [
    `M ${route.p1.x} ${route.p1.y}`,
    `C ${route.c1.x} ${route.c1.y} ${route.c2.x} ${route.c2.y} ${route.p2.x} ${route.p2.y}`,
  ].join(" ");
}

export function createOriginalBodygraphGeometry() {
  validateBodygraphTopology();
  const anchors = createCenterAnchors();
  const centers = createCenterGeometry(anchors);
  const gates = createGateGeometry(centers, anchors);
  const channels = createChannelGeometry(BODYGRAPH_CHANNELS, gates, centers);

  if (centers.length !== 9 || gates.length !== 64 || channels.length !== 36) {
    throw new Error("Original BodyGraph geometry is incomplete.");
  }
  if ([...centers, ...gates, ...channels].some((entry) => (
    ["x", "y"].some((key) => key in entry && !Number.isFinite(entry[key]))
  ))) {
    throw new Error("Original BodyGraph geometry contains a non-finite coordinate.");
  }

  return Object.freeze({
    viewBox: BODYGRAPH_VIEWBOX,
    anchors,
    centers: Object.freeze(centers),
    gates: Object.freeze(gates),
    channels: Object.freeze(channels),
  });
}
