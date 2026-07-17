import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Independent Pluto BodyGraph geometry. Every coordinate and SVG shape below
// is original to this project; only the public gate/channel relationships remain.
const channels = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48],
  [17, 62], [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43],
  [24, 61], [25, 51], [26, 44], [27, 50], [28, 38], [29, 46], [30, 41],
  [32, 54], [34, 57], [35, 36], [37, 40], [39, 55], [42, 53], [47, 64],
];

const centers = {
  "head-center": { gates: [64, 61, 63], shape: '<path id="head-center" d="M211 28 151 129H271Z"/>', points: [[184, 94], [211, 94], [238, 94]] },
  "ajna-center": { gates: [47, 24, 4, 17, 43, 11], shape: '<path id="ajna-center" d="M151 151H271L211 243Z"/>', points: [[176, 174], [211, 174], [246, 174], [184, 207], [211, 214], [238, 207]] },
  "throat-center": { gates: [62, 23, 56, 16, 35, 12, 45, 31, 8, 33, 20], shape: '<rect id="throat-center" x="153" y="258" width="116" height="122" rx="12"/>', points: [[175, 281], [211, 281], [247, 281], [175, 312], [211, 312], [247, 312], [166, 344], [188, 354], [211, 354], [234, 354], [256, 344]] },
  "g-center": { gates: [7, 1, 13, 10, 15, 2, 46, 25], shape: '<path id="g-center" d="M211 397 290 475 211 553 132 475Z"/>', points: [[187, 436], [211, 423], [235, 436], [164, 475], [258, 475], [187, 514], [211, 527], [235, 514]] },
  "heart-center": { gates: [21, 51, 26, 40], shape: '<path id="heart-center" d="M291 414 351 440 302 474Z"/>', points: [[307, 436], [330, 438], [307, 454], [330, 456]] },
  "sacral-center": { gates: [34, 5, 14, 29, 59, 9, 3, 42, 27], shape: '<rect id="sacral-center" x="156" y="576" width="110" height="118" rx="13"/>', points: [[178, 600], [211, 600], [244, 600], [178, 635], [211, 635], [244, 635], [178, 670], [211, 670], [244, 670]] },
  "splenic-center": { gates: [48, 57, 44, 50, 32, 28, 18], shape: '<path id="splenic-center" d="M44 503 137 457 137 648 44 602Z"/>', points: [[67, 514], [101, 494], [120, 526], [82, 551], [120, 570], [82, 592], [120, 618]] },
  "solar-plexus-center": { gates: [36, 22, 37, 6, 49, 55, 30], shape: '<path id="solar-plexus-center" d="M378 503 285 457 285 648 378 602Z"/>', points: [[355, 514], [321, 494], [302, 526], [340, 551], [302, 570], [340, 592], [302, 618]] },
  "root-center": { gates: [53, 60, 52, 54, 38, 58, 19, 39, 41], shape: '<rect id="root-center" x="151" y="716" width="120" height="76" rx="13"/>', points: [[172, 738], [211, 738], [250, 738], [172, 762], [192, 773], [211, 773], [230, 773], [250, 762], [211, 751]] },
};

const gatePoints = new Map();
for (const center of Object.values(centers)) center.gates.forEach((gate, index) => gatePoints.set(gate, center.points[index]));

function polygonForSegment(start, end, offset, width) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const ox = nx * offset;
  const oy = ny * offset;
  const wx = nx * width / 2;
  const wy = ny * width / 2;
  return [[start[0] + ox - wx, start[1] + oy - wy], [start[0] + ox + wx, start[1] + oy + wy], [end[0] + ox + wx, end[1] + oy + wy], [end[0] + ox - wx, end[1] + oy - wy]]
    .map((point) => point.map((value) => value.toFixed(2)).join(",")).join(" ");
}

const channelBase = [];
const channelActivations = [];
for (const [gateA, gateB] of channels) {
  const a = gatePoints.get(gateA);
  const b = gatePoints.get(gateB);
  const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  channelBase.push(`<path d="M${a.join(" ")} L${b.join(" ")}"/>`);
  for (const [gate, start, end] of [[gateA, a, middle], [gateB, b, middle]]) {
    channelActivations.push(`<polygon data-gate-line="${gate}" data-gate-line-type="design" points="${polygonForSegment(start, end, -2.25, 4.2)}"/>`);
    channelActivations.push(`<polygon data-gate-line="${gate}" data-gate-line-type="personality" points="${polygonForSegment(start, end, 2.25, 4.2)}"/>`);
  }
}

const centerShapes = Object.values(centers).map((center) => center.shape).join("\n    ");
const gateLabels = [...gatePoints.entries()].map(([gate, [x, y]]) => `
    <g class="gate">
      <circle cx="${x}" cy="${y}" r="9"/>
      <text x="${x}" y="${y + 0.5}" data-gate-number="${gate}">${gate}</text>
    </g>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 422 813">
  <title>Pluto Life Manual BodyGraph</title>
  <defs><radialGradient id="aura" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="#f8ead4" stop-opacity=".38"/><stop offset="1" stop-color="#f8ead4" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="211" cy="430" rx="195" ry="360" fill="url(#aura)"/>
  <g fill="none" stroke="#c08a3c" stroke-width="1" opacity=".22"><ellipse cx="211" cy="430" rx="174" ry="330"/><ellipse cx="211" cy="430" rx="142" ry="286"/></g>
  <g fill="none" stroke="#d3993d" stroke-width="8" stroke-linecap="round" opacity=".88">${channelBase.join("")}</g>
  <g fill="none" stroke="#f2e6d3" stroke-width="5.8" stroke-linecap="round" opacity=".96">${channelBase.join("")}</g>
  <g fill="transparent">${channelActivations.join("")}</g>
  <g fill="#f9eedd" stroke="#a87945" stroke-width="2.4" stroke-linejoin="round">${centerShapes}</g>
  <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="8" font-weight="700" text-anchor="middle" dominant-baseline="middle">${gateLabels}</g>
</svg>\n`;

await writeFile(resolve(import.meta.dirname, "../assets/bodygraph-template.svg"), svg);
console.log("Generated independent Pluto BodyGraph template");
