import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Original Pluto BodyGraph geometry. Gate and channel relationships are public
// domain system data; every visual coordinate and curve is drawn for this app.
const channels = [
  { gates: [1, 8] },
  { gates: [2, 14] },
  { gates: [3, 60] },
  { gates: [4, 63] },
  { gates: [5, 15], control: [166, 468] },
  { gates: [6, 59] },
  { gates: [7, 31] },
  { gates: [9, 52] },
  { gates: [10, 20] },
  { gates: [10, 34], control: [165, 475] },
  { gates: [10, 57], control: [126, 420] },
  { gates: [11, 56] },
  { gates: [12, 22], control: [316, 330] },
  { gates: [13, 33] },
  { gates: [16, 48], control: [92, 346] },
  { gates: [17, 62] },
  { gates: [18, 58], control: [78, 676] },
  { gates: [19, 49], control: [300, 675] },
  { gates: [20, 34], control: [276, 438] },
  { gates: [20, 57], control: [128, 328] },
  { gates: [21, 45], control: [291, 333] },
  { gates: [23, 43] },
  { gates: [24, 61] },
  { gates: [25, 51] },
  { gates: [26, 44], control: [190, 454] },
  { gates: [27, 50] },
  { gates: [28, 38], control: [102, 670] },
  { gates: [29, 46] },
  { gates: [30, 41], control: [330, 660] },
  { gates: [32, 54], control: [112, 650] },
  { gates: [34, 57], control: [132, 530] },
  { gates: [35, 36], control: [330, 350] },
  { gates: [37, 40] },
  { gates: [39, 55], control: [318, 670] },
  { gates: [42, 53] },
  { gates: [47, 64] },
];

function roundedPolygonPath(points, radius) {
  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const previousLength = Math.hypot(previous[0] - point[0], previous[1] - point[1]) || 1;
    const nextLength = Math.hypot(next[0] - point[0], next[1] - point[1]) || 1;
    const distance = Math.min(radius, previousLength / 3, nextLength / 3);
    return {
      corner: point,
      start: [point[0] + (previous[0] - point[0]) * distance / previousLength, point[1] + (previous[1] - point[1]) * distance / previousLength],
      end: [point[0] + (next[0] - point[0]) * distance / nextLength, point[1] + (next[1] - point[1]) * distance / nextLength],
    };
  });
  const number = (value) => Number(value.toFixed(2));
  const first = corners[0];
  return [`M${number(first.start[0])} ${number(first.start[1])}`]
    .concat(corners.map(({ corner, end }) => `Q${corner[0]} ${corner[1]} ${number(end[0])} ${number(end[1])}`))
    .concat("Z")
    .join(" ");
}

const centers = {
  "head-center": {
    gates: [64, 61, 63],
    shape: `<path id="head-center" d="${roundedPolygonPath([[211, 15], [253, 89], [169, 89]], 9)}"/>`,
    points: [[185, 76], [211, 76], [237, 76]],
  },
  "ajna-center": {
    gates: [47, 24, 4, 17, 43, 11],
    shape: `<path id="ajna-center" d="${roundedPolygonPath([[169, 121], [253, 121], [211, 200]], 9)}"/>`,
    points: [[185, 134], [211, 134], [237, 134], [185, 184], [211, 184], [237, 184]],
  },
  "throat-center": {
    gates: [62, 23, 56, 16, 35, 12, 45, 31, 8, 33, 20],
    shape: '<rect id="throat-center" x="169" y="231" width="84" height="88" rx="11"/>',
    points: [[185, 244], [211, 244], [237, 244], [181, 270], [241, 270], [241, 292], [179, 306], [195, 306], [211, 306], [227, 306], [243, 306]],
  },
  "g-center": {
    gates: [7, 1, 13, 10, 15, 2, 46, 25],
    shape: `<path id="g-center" d="${roundedPolygonPath([[211, 360], [254, 403], [211, 446], [168, 403]], 9)}"/>`,
    points: [[190, 382], [211, 374], [232, 382], [181, 403], [190, 424], [211, 435], [232, 424], [241, 403]],
  },
  "heart-center": {
    gates: [21, 51, 26, 40],
    shape: `<path id="heart-center" d="${roundedPolygonPath([[272, 423], [341, 451], [280, 486]], 8)}"/>`,
    points: [[284, 441], [298, 448], [292, 468], [325, 455]],
  },
  "sacral-center": {
    gates: [34, 5, 14, 29, 59, 9, 3, 42, 27],
    shape: '<rect id="sacral-center" x="169" y="503" width="84" height="94" rx="11"/>',
    points: [[180, 548], [187, 518], [211, 518], [235, 518], [242, 548], [235, 582], [187, 582], [211, 582], [180, 571]],
  },
  "splenic-center": {
    gates: [48, 57, 44, 50, 32, 28, 18],
    shape: `<path id="splenic-center" d="${roundedPolygonPath([[21, 504], [98, 467], [98, 592], [21, 555]], 9)}"/>`,
    points: [[36, 507], [82, 486], [88, 516], [88, 540], [88, 562], [68, 575], [40, 558]],
  },
  "solar-plexus-center": {
    gates: [36, 22, 37, 6, 49, 55, 30],
    shape: `<path id="solar-plexus-center" d="${roundedPolygonPath([[401, 504], [324, 467], [324, 592], [401, 555]], 9)}"/>`,
    points: [[386, 507], [340, 486], [334, 516], [334, 540], [334, 562], [354, 575], [382, 558]],
  },
  "root-center": {
    gates: [53, 60, 52, 54, 38, 58, 19, 39, 41],
    shape: '<rect id="root-center" x="169" y="621" width="84" height="82" rx="11"/>',
    points: [[185, 635], [211, 635], [237, 635], [180, 654], [180, 675], [190, 692], [232, 692], [242, 675], [242, 654]],
  },
};

const gatePoints = new Map();
for (const center of Object.values(centers)) {
  center.gates.forEach((gate, index) => gatePoints.set(gate, center.points[index]));
}

const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const quadraticPoint = (a, control, b, t) => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * control[0] + t ** 2 * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * control[1] + t ** 2 * b[1],
];

function offsetSegment(points, offset) {
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy) || 1;
  const normal = [-dy / length * offset, dx / length * offset];
  return points.map(([x, y]) => [x + normal[0], y + normal[1]]);
}

function segmentPath(points, offset = 0) {
  const adjusted = offsetSegment(points, offset);
  const format = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  if (adjusted.length === 2) return `M${format(adjusted[0])} L${format(adjusted[1])}`;
  return `M${format(adjusted[0])} Q${format(adjusted[1])} ${format(adjusted[2])}`;
}

const channelBase = [];
const channelActivations = [];
for (const { gates: [gateA, gateB], control } of channels) {
  const a = gatePoints.get(gateA);
  const b = gatePoints.get(gateB);
  const middle = control ? quadraticPoint(a, control, b, 0.5) : midpoint(a, b);
  const firstHalf = control ? [a, midpoint(a, control), middle] : [a, middle];
  const secondHalf = control ? [b, midpoint(b, control), middle] : [b, middle];
  channelBase.push(`<path d="${control ? segmentPath([a, control, b]) : segmentPath([a, b])}"/>`);
  for (const [gate, segment] of [[gateA, firstHalf], [gateB, secondHalf]]) {
    channelActivations.push(`<path data-gate-line="${gate}" data-gate-line-type="design" d="${segmentPath(segment, -2.15)}"/>`);
    channelActivations.push(`<path data-gate-line="${gate}" data-gate-line-type="personality" d="${segmentPath(segment, 2.15)}"/>`);
  }
}

const centerShapes = Object.values(centers).map((center) => center.shape).join("\n    ");
const gateLabels = [...gatePoints.entries()].map(([gate, [x, y]]) => `
    <g class="gate">
      <circle cx="${x}" cy="${y}" r="7.1"/>
      <text x="${x}" y="${y + 0.25}" data-gate-number="${gate}">${gate}</text>
    </g>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 422 813">
  <title>Pluto Life Manual BodyGraph</title>
  <defs>
    <radialGradient id="aura" cx="50%" cy="43%" r="62%"><stop offset="0" stop-color="#f8ead4" stop-opacity=".34"/><stop offset="1" stop-color="#f8ead4" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="211" cy="406" rx="195" ry="348" fill="url(#aura)"/>
  <g fill="none" stroke="#c08a3c" stroke-width="1" opacity=".2"><ellipse cx="211" cy="406" rx="174" ry="316"/><ellipse cx="211" cy="406" rx="142" ry="274"/></g>
  <g fill="none" stroke="#d3993d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".9">${channelBase.join("")}</g>
  <g fill="none" stroke="#f3e8d8" stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round" opacity=".98">${channelBase.join("")}</g>
  <g fill="none" stroke="transparent" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round">${channelActivations.join("")}</g>
  <g fill="#f9eedd" stroke="#a87945" stroke-width="2.2" stroke-linejoin="round" style="paint-order:stroke fill">${centerShapes}</g>
  <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="6.4" font-weight="700" text-anchor="middle" dominant-baseline="middle">${gateLabels}</g>
</svg>\n`;

await writeFile(resolve(import.meta.dirname, "../assets/bodygraph-template.svg"), svg);
console.log("Generated refined Pluto BodyGraph template");
