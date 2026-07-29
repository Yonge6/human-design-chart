import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BODYGRAPH_CENTERS,
  BODYGRAPH_CHANNELS,
  validateBodygraphTopology,
} from "../src/visualization/bodygraph-functional-topology.js";
import {
  createOriginalBodygraphGeometry,
  offsetRoute,
  routeToPath,
} from "../src/visualization/bodygraph-original-geometry.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const outputPath = resolve(projectDirectory, "assets/bodygraph-original-template.svg");

const metadata = [
  "Project: Pluto Life Manual",
  "Asset: Original style-preserving BodyGraph template",
  "Design version: Phase 6E v2",
  "Generator: scripts/generate-original-bodygraph.mjs",
  "Specification: docs/style-preserving-bodygraph-design-spec.md",
  "License: AGPL-3.0-or-later",
];

const format = (value) => Number(value.toFixed(3));
const attributes = (values) => Object.entries(values)
  .map(([name, value]) => `${name}="${String(value)}"`)
  .join(" ");

function gateMarker(gate) {
  return [
    `    <g id="gate-${gate.gate}" data-gate="${gate.gate}" data-center="${gate.center}">`,
    `      <circle ${attributes({
      "data-gate-marker": gate.gate,
      cx: gate.x,
      cy: gate.y,
      r: 5.6,
      class: "gate-badge",
    })} />`,
    `      <circle ${attributes({
      "data-gate-line": gate.gate,
      "data-gate-line-type": "personality",
      cx: format(gate.x - 3),
      cy: format(gate.y + 7),
      r: 1.35,
      class: "gate-source gate-source-personality",
    })} />`,
    `      <circle ${attributes({
      "data-gate-line": gate.gate,
      "data-gate-line-type": "design",
      cx: format(gate.x + 3),
      cy: format(gate.y + 7),
      r: 1.6,
      class: "gate-source gate-source-design",
    })} />`,
    `      <text ${attributes({
      "data-gate-number": gate.gate,
      x: gate.x,
      y: format(gate.y + 0.25),
      class: "gate-number",
    })}>${gate.gate}</text>`,
    "    </g>",
  ].join("\n");
}

function centerShape(center) {
  const notchSize = 3;
  const notchPath = [
    `M ${format(center.notch.x)} ${format(center.notch.y - notchSize)}`,
    `L ${format(center.notch.x + notchSize)} ${format(center.notch.y)}`,
    `L ${format(center.notch.x)} ${format(center.notch.y + notchSize)}`,
    `L ${format(center.notch.x - notchSize)} ${format(center.notch.y)}`,
    "Z",
  ].join(" ");

  return [
    `    <g data-center-group="${center.key}" aria-label="${center.name} center">`,
    `      <path id="${center.id}" data-center-shape="${center.key}" data-center-state="undefined" class="center-shape" d="${center.path}" />`,
    `      <path data-center-inner="${center.key}" class="center-inner" d="${center.innerPath}" />`,
    `      <path data-center-notch="${center.key}" class="center-notch" d="${notchPath}" />`,
    `      <text x="${center.x}" y="${format(center.y + 2)}" class="center-label">${center.shortLabel}</text>`,
    "    </g>",
  ].join("\n");
}

function channelShape(channel) {
  const personalityRoute = offsetRoute(channel, -2.8);
  const designRoute = offsetRoute(channel, 2.8);
  const structuralPath = routeToPath(channel);
  const personalityPath = routeToPath(personalityRoute);
  const designPath = routeToPath(designRoute);
  const gatePair = channel.gates.join(" ");

  return [
    `    <g id="channel-${channel.id}" data-channel="${channel.id}" data-gates="${gatePair}" data-route="${channel.routeType}">`,
    `      <path data-channel-structure="${channel.id}" class="channel-structure" d="${structuralPath}" />`,
    `      <path data-channel-lane-halo="personality" class="channel-halo" pathLength="100" d="${personalityPath}" />`,
    `      <path data-channel-lane="personality" class="channel-lane channel-personality" pathLength="100" d="${personalityPath}" />`,
    `      <path data-channel-lane-halo="design" class="channel-halo" pathLength="100" d="${designPath}" />`,
    `      <path data-channel-lane="design" class="channel-lane channel-design" pathLength="100" d="${designPath}" />`,
    `      <circle data-channel-clasp="start" cx="${channel.p1.x}" cy="${channel.p1.y}" r="2.2" class="channel-clasp" />`,
    `      <circle data-channel-clasp="end" cx="${channel.p2.x}" cy="${channel.p2.y}" r="2.2" class="channel-clasp" />`,
    "    </g>",
  ].join("\n");
}

function createSvg() {
  const topology = validateBodygraphTopology();
  const geometry = createOriginalBodygraphGeometry();
  const expectedCenters = new Set(BODYGRAPH_CENTERS.map((center) => center.key));
  const actualCenters = new Set(geometry.centers.map((center) => center.key));
  if (
    topology.centers !== 9
    || topology.gates !== 64
    || topology.channels !== 36
    || expectedCenters.size !== actualCenters.size
    || BODYGRAPH_CHANNELS.length !== geometry.channels.length
  ) {
    throw new Error("BodyGraph source data is incomplete.");
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.viewBox.width} ${geometry.viewBox.height}" role="img" aria-labelledby="bodygraph-title bodygraph-description" data-bodygraph-template="original-phase-6e-v2">`,
    "  <title id=\"bodygraph-title\">Pluto Life Manual BodyGraph</title>",
    "  <desc id=\"bodygraph-description\">An original vertical life-axis network with nine centers, sixty-four gates, and dual Personality and Design channel lanes.</desc>",
    "  <metadata>",
    ...metadata.map((line) => `    ${line}`),
    "  </metadata>",
    "  <defs>",
    "    <pattern id=\"undefined-grain\" width=\"8\" height=\"8\" patternUnits=\"userSpaceOnUse\">",
    "      <rect width=\"8\" height=\"8\" fill=\"#f8eddd\" fill-opacity=\"0.72\" />",
    "      <path d=\"M -2 8 L 8 -2 M 3 11 L 11 3\" stroke=\"#a87945\" stroke-width=\"0.6\" stroke-opacity=\"0.18\" />",
    "    </pattern>",
    "    <style>",
    "      .channel-structure { fill: none; stroke: #806e60; stroke-width: 1; stroke-opacity: .18; stroke-linecap: round; }",
    "      .channel-halo { fill: none; stroke: #f7ead8; stroke-width: 6.2; stroke-opacity: 0; stroke-linecap: round; }",
    "      .channel-lane { fill: none; stroke-width: 2.35; stroke-opacity: 0; stroke-linecap: round; }",
    "      .channel-personality { stroke: #b9a6dd; }",
    "      .channel-design { stroke: #9a2838; stroke-dasharray: 3 2; }",
    "      .channel-clasp { fill: #d8b17d; stroke: #6d5035; stroke-width: .8; opacity: 0; }",
    "      .center-shape { fill: url(#undefined-grain); stroke: #a87945; stroke-width: 1.5; stroke-dasharray: 3.2 2.4; stroke-linejoin: round; filter: drop-shadow(0 1.5px 1.4px rgba(55, 36, 34, .16)); }",
    "      .center-inner { fill: none; stroke: #b78345; stroke-width: 1; stroke-opacity: .2; }",
    "      .center-notch { fill: #f8eddd; stroke: #a87945; stroke-width: 1; }",
    "      .center-label { fill: #4f4541; font: 650 7.4px ui-sans-serif, system-ui, sans-serif; letter-spacing: 0; text-anchor: middle; dominant-baseline: middle; }",
    "      .gate-badge { fill: #f7ecdc; stroke: #cbbca8; stroke-width: 1; }",
    "      .gate-number { fill: #503d3d; font: 750 6.4px ui-sans-serif, system-ui, sans-serif; letter-spacing: 0; text-anchor: middle; dominant-baseline: middle; }",
    "      .gate-source { opacity: 0; }",
    "      .gate-source-personality { fill: #b9a6dd; stroke: #302936; stroke-width: .6; }",
    "      .gate-source-design { fill: #f8eddd; stroke: #9a2838; stroke-width: 1; }",
    "      @media (forced-colors: active) {",
    "        .channel-personality { stroke: CanvasText; }",
    "        .channel-design { stroke: CanvasText; stroke-dasharray: 3 2; }",
    "        .center-shape { fill: Canvas; stroke: CanvasText; }",
    "      }",
    "    </style>",
    "  </defs>",
    "  <g id=\"bodygraph-network\" aria-label=\"BodyGraph channels\">",
    ...geometry.channels.map(channelShape),
    "  </g>",
    "  <g id=\"bodygraph-centers\" aria-label=\"BodyGraph centers\">",
    ...geometry.centers.map(centerShape),
    "  </g>",
    "  <g id=\"bodygraph-gates\" aria-label=\"BodyGraph gates\">",
    ...geometry.gates.map(gateMarker),
    "  </g>",
    "</svg>",
    "",
  ].join("\n");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, createSvg(), "utf8");
console.log("Generated assets/bodygraph-original-template.svg (9 centers, 64 gates, 36 channels).");
