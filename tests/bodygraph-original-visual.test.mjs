import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

import { createBodygraphRenderer } from "../src/renderer/bodygraph-renderer.js";
import {
  BODYGRAPH_CENTERS,
  BODYGRAPH_CHANNELS,
  BODYGRAPH_GATE_TO_CENTER,
  getGatePeers,
  validateBodygraphTopology,
} from "../src/visualization/bodygraph-functional-topology.js";
import {
  BODYGRAPH_VIEWBOX,
  createOriginalBodygraphGeometry,
} from "../src/visualization/bodygraph-original-geometry.js";

const runFile = promisify(execFile);
const projectRoot = new URL("../", import.meta.url);
const svgUrl = new URL("../assets/bodygraph-original-template.svg", import.meta.url);
const generatorUrl = new URL("../scripts/generate-original-bodygraph.mjs", import.meta.url);
const expectedSvgSha = "1f937e8271853ec10af01c6d5d7ad959c637f32da1da4e8de475129c32a74c68";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function parseAttributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
}

function toDataset(attributes) {
  return Object.fromEntries(Object.entries(attributes)
    .filter(([name]) => name.startsWith("data-"))
    .map(([name, value]) => [
      name.slice(5).replace(/-([a-z])/g, (_, character) => character.toUpperCase()),
      value,
    ]));
}

function selectorMatches(element, selector) {
  if (selector === "svg") return element.tagName === "svg";
  if (selector.startsWith("#")) return element.id === selector.slice(1);
  const attribute = selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
  if (!attribute) throw new Error(`Unsupported test selector: ${selector}`);
  const [, name, expected] = attribute;
  const value = element.attributes[name];
  return expected === undefined ? value !== undefined : value === expected;
}

class FakeElement {
  constructor(tagName, attributes = {}, children = []) {
    this.tagName = tagName;
    this.attributes = { ...attributes };
    this.dataset = toDataset(attributes);
    this.id = attributes.id || "";
    this.style = {};
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      if (selectorMatches(element, selector)) matches.push(element);
      element.children.forEach(visit);
    };
    this.children.forEach(visit);
    return matches;
  }
}

function elementsFromSelfClosingTags(source) {
  return [...source.matchAll(/<(path|circle)\s+([^>]+?)\s*\/>/g)]
    .map((match) => new FakeElement(match[1], parseAttributes(match[2])));
}

function fakeSvgFromTemplate(template) {
  const rootMatch = template.match(/<svg\s+([^>]+)>/);
  assert.ok(rootMatch, "template has an SVG root");
  const children = [];

  for (const match of template.matchAll(/<g\s+([^>]*data-channel="[^"]+"[^>]*)>([\s\S]*?)<\/g>/g)) {
    children.push(new FakeElement("g", parseAttributes(match[1]), elementsFromSelfClosingTags(match[2])));
  }
  for (const match of template.matchAll(/<g\s+([^>]*data-center-group="[^"]+"[^>]*)>([\s\S]*?)<\/g>/g)) {
    children.push(new FakeElement("g", parseAttributes(match[1]), elementsFromSelfClosingTags(match[2])));
  }
  for (const match of template.matchAll(/<circle\s+([^>]*data-gate-(?:marker|line)="[^"]+"[^>]*)\s*\/>/g)) {
    children.push(new FakeElement("circle", parseAttributes(match[1])));
  }
  for (const match of template.matchAll(/<text\s+([^>]*data-gate-number="[^"]+"[^>]*)>/g)) {
    children.push(new FakeElement("text", parseAttributes(match[1])));
  }

  return new FakeElement("svg", parseAttributes(rootMatch[1]), children);
}

class FakeContainer {
  constructor() {
    this.svg = null;
  }

  set innerHTML(value) {
    this.svg = fakeSvgFromTemplate(value);
  }

  querySelector(selector) {
    if (selector === "svg") return this.svg;
    return this.svg?.querySelector(selector) || null;
  }
}

const activation = (gate) => ({ Gate: gate });
const chartData = ({ personality = [], design = [], defined = [] } = {}) => ({
  Personality: Object.fromEntries(personality.map((gate, index) => [`p${index}`, activation(gate)])),
  Design: Object.fromEntries(design.map((gate, index) => [`d${index}`, activation(gate)])),
  "Defined Centers": defined,
});

test("functional topology and original geometry are complete and renderer-compatible", () => {
  const topology = validateBodygraphTopology();
  assert.deepEqual(topology, { centers: 9, gates: 64, channels: 36 });
  assert.equal(BODYGRAPH_CENTERS.length, 9);
  assert.equal(BODYGRAPH_CHANNELS.length, 36);

  const ownedGates = BODYGRAPH_CENTERS.flatMap((center) => center.gates);
  assert.deepEqual([...ownedGates].sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index + 1));
  assert.equal(new Set(ownedGates).size, 64);
  assert.equal(Object.keys(BODYGRAPH_GATE_TO_CENTER).length, 64);

  const expectedCenterIds = [
    "head-center",
    "ajna-center",
    "throat-center",
    "g-center",
    "heart-center",
    "splenic-center",
    "solar-plexus-center",
    "sacral-center",
    "root-center",
  ];
  assert.deepEqual(BODYGRAPH_CENTERS.map((center) => center.id), expectedCenterIds);

  for (const channel of BODYGRAPH_CHANNELS) {
    assert.equal(channel.gates.length, 2);
    assert.notEqual(channel.gates[0], channel.gates[1]);
    for (const gate of channel.gates) assert.ok(BODYGRAPH_GATE_TO_CENTER[gate]);
  }
  for (let gate = 1; gate <= 64; gate += 1) assert.ok(getGatePeers(gate).length > 0);

  const geometry = createOriginalBodygraphGeometry();
  assert.deepEqual(BODYGRAPH_VIEWBOX, {
    width: 360,
    height: 620,
    safeMarginX: 14,
    safeMarginTop: 12,
    safeMarginBottom: 18,
  });
  assert.equal(geometry.centers.length, 9);
  assert.equal(geometry.gates.length, 64);
  assert.equal(geometry.channels.length, 36);
  assert.deepEqual(geometry.centers.map((center) => center.id), expectedCenterIds);
});

test("generator is deterministic, self-contained, and matches the committed SVG", async () => {
  const committed = await readFile(svgUrl);
  const sourceUrls = [
    generatorUrl,
    new URL("../src/visualization/bodygraph-functional-topology.js", import.meta.url),
    new URL("../src/visualization/bodygraph-original-geometry.js", import.meta.url),
  ];
  const generatorSources = (await Promise.all(sourceUrls.map((url) => readFile(url, "utf8")))).join("\n");

  assert.doesNotMatch(generatorSources, /Math\.random|crypto\.random|randomUUID/);
  assert.doesNotMatch(generatorSources, /\bnew Date\b|\bDate\.now\b|toISOString/);
  assert.doesNotMatch(generatorSources, /\bfetch\s*\(|node:https?|node:net|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(generatorSources, /node:child_process|\bgit\s+(?:show|log|diff|blame)\b/);
  assert.doesNotMatch(generatorSources, /\breadFile\b|createReadStream/);
  assert.match(generatorSources, /\bwriteFile\b/);

  const runGenerator = () => runFile(process.execPath, [generatorUrl.pathname], {
    cwd: projectRoot.pathname,
    env: { ...process.env },
  });
  await runGenerator();
  const first = await readFile(svgUrl);
  await runGenerator();
  const second = await readFile(svgUrl);

  assert.deepEqual(first, committed);
  assert.deepEqual(second, first);
  assert.equal(sha256(committed), expectedSvgSha);
  assert.equal(sha256(first), sha256(second));
});

test("generated SVG has the complete accessible local-only structure", async () => {
  const svg = await readFile(svgUrl, "utf8");
  assert.match(svg, /viewBox="0 0 360 620"/);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-labelledby="bodygraph-title bodygraph-description"/);
  assert.match(svg, /<title id="bodygraph-title">/);
  assert.match(svg, /<desc id="bodygraph-description">/);

  const centers = [...svg.matchAll(/data-center-shape="([^"]+)"/g)].map((match) => match[1]);
  const gates = [...svg.matchAll(/data-gate-number="(\d+)"/g)].map((match) => Number(match[1]));
  const channels = [...svg.matchAll(/<g id="channel-([^"]+)" data-channel="([^"]+)" data-gates="(\d+) (\d+)"/g)];
  assert.equal(centers.length, 9);
  assert.equal(new Set(centers).size, 9);
  assert.equal(gates.length, 64);
  assert.equal(new Set(gates).size, 64);
  assert.deepEqual([...gates].sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index + 1));
  assert.equal(channels.length, 36);
  assert.equal((svg.match(/data-channel-structure=/g) || []).length, 36);
  assert.equal((svg.match(/data-channel-lane="personality"/g) || []).length, 36);
  assert.equal((svg.match(/data-channel-lane="design"/g) || []).length, 36);

  assert.match(svg, /data-center-state="undefined"/);
  assert.match(svg, /undefined-grain/);
  assert.match(svg, /stroke-dasharray: 3\.2 2\.4/);
  assert.match(svg, /\.channel-personality \{ stroke: #[0-9a-f]+; \}/i);
  assert.match(svg, /\.channel-design \{ stroke: #[0-9a-f]+; stroke-dasharray: 3 2; \}/i);

  const urls = [...svg.matchAll(/https?:\/\/[^\s"<]+/g)].map((match) => match[0]);
  assert.deepEqual(urls, ["http://www.w3.org/2000/svg"]);
  assert.doesNotMatch(svg, /<(?:image|script|link|foreignObject)\b/i);
  assert.doesNotMatch(svg, /(?:href|src)="(?!#)/i);
  assert.doesNotMatch(svg, /@import|url\((?!#)/i);
  assert.doesNotMatch(svg, /\/Users\/|file:\/\/|\/tmp\/|[A-Za-z]:\\/);
  assert.doesNotMatch(svg, /\b20\d{2}-\d{2}-\d{2}\b/);
  assert.doesNotMatch(svg, /My Human Design/i);
});

test("renderer resets and expresses activation, channel, center, and accessibility states", async () => {
  const template = await readFile(svgUrl, "utf8");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => template });

  try {
    const container = new FakeContainer();
    const centerColors = Object.fromEntries(BODYGRAPH_CENTERS.map((center, index) => [
      center.id,
      `rgb(${100 + index}, ${80 + index}, ${60 + index})`,
    ]));
    const paint = createBodygraphRenderer({
      container,
      templateUrl: "./assets/bodygraph-original-template.svg",
      centerColors,
      label: "Test BodyGraph",
    });
    const [startGate, endGate] = BODYGRAPH_CHANNELS[0].gates;
    const channelSelector = `[data-channel="${BODYGRAPH_CHANNELS[0].id}"]`;

    let svg = await paint(chartData());
    let channel = svg.querySelector(channelSelector);
    assert.equal(channel.querySelector('[data-channel-lane="personality"]').style.strokeOpacity, "0");
    assert.equal(channel.querySelector('[data-channel-lane="design"]').style.strokeOpacity, "0");
    assert.equal(channel.querySelector('[data-channel-lane-halo="personality"]').style.strokeOpacity, "0");
    assert.equal(channel.querySelector('[data-channel-lane-halo="design"]').style.strokeOpacity, "0");
    assert.ok(channel.querySelectorAll("[data-channel-clasp]").every((clasp) => clasp.style.opacity === "0"));
    assert.match(svg.getAttribute("aria-label"), /0 active gates and 0 defined centers/);

    svg = await paint(chartData({ personality: [startGate] }));
    channel = svg.querySelector(channelSelector);
    let lane = channel.querySelector('[data-channel-lane="personality"]');
    assert.equal(lane.style.strokeOpacity, "1");
    assert.equal(lane.style.strokeDasharray, "48 52");
    assert.equal(lane.style.strokeDashoffset, "0");
    assert.equal(channel.querySelector('[data-channel-lane="design"]').style.strokeOpacity, "0");

    svg = await paint(chartData({ personality: [endGate] }));
    channel = svg.querySelector(channelSelector);
    lane = channel.querySelector('[data-channel-lane="personality"]');
    assert.equal(lane.style.strokeDasharray, "48 52");
    assert.equal(lane.style.strokeDashoffset, "-48");

    svg = await paint(chartData({ design: [startGate] }));
    channel = svg.querySelector(channelSelector);
    lane = channel.querySelector('[data-channel-lane="design"]');
    assert.equal(lane.style.strokeOpacity, "1");
    assert.equal(lane.style.strokeDasharray, "48 52");
    assert.equal(lane.style.strokeDashoffset, "0");
    assert.equal(channel.querySelector('[data-channel-lane="personality"]').style.strokeOpacity, "0");

    svg = await paint(chartData({ personality: [startGate, endGate] }));
    channel = svg.querySelector(channelSelector);
    assert.equal(channel.querySelector('[data-channel-lane="personality"]').style.strokeDasharray, "none");
    assert.equal(channel.querySelector('[data-channel-lane-halo="personality"]').style.strokeDasharray, "none");
    assert.ok(channel.querySelectorAll("[data-channel-clasp]").every((clasp) => clasp.style.opacity === "0"));

    svg = await paint(chartData({ design: [startGate, endGate] }));
    channel = svg.querySelector(channelSelector);
    assert.equal(channel.querySelector('[data-channel-lane="design"]').style.strokeDasharray, "3 2");
    assert.equal(channel.querySelector('[data-channel-lane-halo="design"]').style.strokeDasharray, "none");
    assert.ok(channel.querySelectorAll("[data-channel-clasp]").every((clasp) => clasp.style.opacity === "0"));

    svg = await paint(chartData({
      personality: [startGate, endGate],
      design: [startGate, endGate],
      defined: ["g center"],
    }));
    channel = svg.querySelector(channelSelector);
    assert.ok(channel.querySelectorAll("[data-channel-clasp]").every((clasp) => clasp.style.opacity === "1"));
    assert.equal(svg.querySelector(`[data-gate-marker="${startGate}"]`).style.strokeWidth, "2.2");
    const personalityMark = svg.querySelectorAll("[data-gate-line]")
      .find((mark) => mark.dataset.gateLine === String(startGate) && mark.dataset.gateLineType === "personality");
    const designMark = svg.querySelectorAll("[data-gate-line]")
      .find((mark) => mark.dataset.gateLine === String(startGate) && mark.dataset.gateLineType === "design");
    assert.equal(personalityMark.style.opacity, "1");
    assert.equal(designMark.style.opacity, "1");

    const definedCenter = svg.querySelector("#g-center");
    const undefinedCenter = svg.querySelector("#head-center");
    assert.equal(definedCenter.dataset.centerState, "defined");
    assert.equal(definedCenter.style.fill, centerColors["g-center"]);
    assert.equal(definedCenter.style.strokeWidth, "2.2");
    assert.equal(definedCenter.style.strokeDasharray, "none");
    assert.equal(undefinedCenter.dataset.centerState, "undefined");
    assert.equal(undefinedCenter.style.fill, "url(#undefined-grain)");
    assert.equal(undefinedCenter.style.strokeWidth, "1.4");
    assert.equal(undefinedCenter.style.strokeDasharray, "3.2 2.4");
    assert.match(svg.getAttribute("aria-label"), /2 active gates and 1 defined centers/);

    svg = await paint({ Design: {}, Personality: {}, "Defined Centers": [] });
    channel = svg.querySelector(channelSelector);
    assert.equal(channel.querySelector('[data-channel-lane="personality"]').style.strokeOpacity, "0");
    assert.equal(channel.querySelector('[data-channel-lane="design"]').style.strokeOpacity, "0");
    assert.ok(channel.querySelectorAll("[data-channel-clasp]").every((clasp) => clasp.style.opacity === "0"));
    assert.equal(svg.querySelector("#g-center").dataset.centerState, "undefined");
    assert.equal(svg.querySelector("#g-center").style.fill, "url(#undefined-grain)");
    assert.match(svg.getAttribute("aria-label"), /0 active gates and 0 defined centers/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
