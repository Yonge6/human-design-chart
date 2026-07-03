const centers = {
  head: { name: "head center", type: "tri", points: [[214,7],[174,96],[254,96]], gates: {64:[190,96],61:[214,78],63:[238,96]} },
  ajna: { name: "ajna center", type: "tri", points: [[214,116],[174,207],[254,207]], gates: {47:[190,118],24:[214,118],4:[238,118],17:[180,205],43:[214,205],11:[248,205]} },
  throat: { name: "throat center", type: "rect", x: 172, y: 247, w: 83, h: 83, gates: {62:[190,247],23:[214,247],56:[238,247],16:[172,288],20:[190,330],31:[204,330],8:[224,330],33:[238,330],45:[255,288],12:[255,315]} },
  g: { name: "g center", type: "diamond", cx: 214, cy: 403, r: 59, gates: {1:[214,344],7:[192,360],13:[236,360],10:[172,403],25:[214,462],2:[236,446],15:[192,446],46:[256,403]} },
  heart: { name: "heart center", type: "tri", points: [[283,425],[346,464],[278,488]], gates: {21:[292,432],51:[286,480],26:[333,462],40:[304,488]} },
  sacral: { name: "sacral center", type: "rect", x: 172, y: 510, w: 83, h: 83, gates: {34:[172,540],14:[190,510],5:[214,510],29:[238,510],27:[172,580],59:[255,580],42:[190,593],3:[214,593],9:[238,593]} },
  spleen: { name: "splenic center", type: "tri", points: [[51,499],[143,466],[136,633]], gates: {48:[140,474],57:[136,508],44:[132,536],50:[130,568],32:[128,600],28:[88,524],18:[88,604]} },
  solar: { name: "solar plexus center", type: "tri", points: [[372,499],[282,466],[288,633]], gates: {22:[286,474],37:[292,526],6:[292,582],30:[335,512],55:[335,556],49:[335,604]} },
  root: { name: "root center", type: "rect", x: 172, y: 621, w: 83, h: 83, gates: {53:[190,621],60:[214,621],52:[238,621],54:[172,666],38:[190,704],58:[214,704],41:[238,704],39:[255,666],19:[255,690]} },
};

const channels = [[64,47],[61,24],[63,4],[17,62],[43,23],[11,56],[16,48],[20,57],[31,7],[8,1],[33,13],[45,21],[12,22],[25,51],[10,57],[10,34],[20,10],[2,14],[15,5],[46,29],[26,44],[40,37],[34,57],[34,20],[27,50],[59,6],[42,53],[3,60],[9,52],[32,54],[28,38],[18,58],[30,41],[55,39],[19,49]];
const planets = ["Sun","Earth","North Node","South Node","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];
const graph = document.querySelector("#bodygraph");
const fields = {
  name: document.querySelector("#name"),
  year: document.querySelector("#year"),
  month: document.querySelector("#month"),
  day: document.querySelector("#day"),
  hour: document.querySelector("#hour"),
  minute: document.querySelector("#minute"),
  ampm: document.querySelector("#ampm"),
  location: document.querySelector("#location"),
  timezone: document.querySelector("#timezone"),
};
let lastData;

function gatePoint(gate) {
  for (const center of Object.values(centers)) if (center.gates[gate]) return center.gates[gate];
}

function svg(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function drawBase(data = {}) {
  graph.innerHTML = "";
  const active = activeGates(data);
  addChartAtmosphere();
  for (const [a, b] of channels) {
    const p1 = gatePoint(a), p2 = gatePoint(b), mid = [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2];
    graph.append(svg("line", { x1:p1[0], y1:p1[1], x2:p2[0], y2:p2[1], class:"channel-bg" }));
    if (active.design.has(a) || active.personality.has(a)) graph.append(svg("line", { x1:p1[0], y1:p1[1], x2:mid[0], y2:mid[1], class:"channel-half", stroke: active.design.has(a) ? "#9a3040" : "#755e95" }));
    if (active.design.has(b) || active.personality.has(b)) graph.append(svg("line", { x1:p2[0], y1:p2[1], x2:mid[0], y2:mid[1], class:"channel-half", stroke: active.design.has(b) ? "#9a3040" : "#755e95" }));
  }

  const defined = new Set((data["Defined Centers"] || []).map(v => v.toLowerCase()));
  for (const [key, center] of Object.entries(centers)) {
    const cls = `center ${key}` + (defined.has(center.name) ? " defined" : "");
    if (center.type === "rect") graph.append(svg("rect", { x:center.x, y:center.y, width:center.w, height:center.h, rx:8, class:cls }));
    if (center.type === "tri") graph.append(svg("polygon", { points:center.points.map(p => p.join(",")).join(" "), class:cls }));
    if (center.type === "diamond") graph.append(svg("polygon", { points:[[center.cx,center.cy-center.r],[center.cx+center.r,center.cy],[center.cx,center.cy+center.r],[center.cx-center.r,center.cy]].map(p => p.join(",")).join(" "), class:cls }));
  }

  for (const center of Object.values(centers)) {
    for (const [gate, point] of Object.entries(center.gates)) {
      const on = active.all.has(Number(gate));
      graph.append(svg("circle", { cx:point[0], cy:point[1], r:12, class:"gate-dot" + (on ? " active" : "") }));
      const text = svg("text", { x:point[0], y:point[1], class:"gate-label" + (on ? " active" : "") });
      text.textContent = gate;
      graph.append(text);
    }
  }
}

function addChartAtmosphere() {
  const defs = svg("defs");
  defs.innerHTML = `
    <radialGradient id="pluto-vellum" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#fbefdc"/>
      <stop offset="62%" stop-color="#ead7bd"/>
      <stop offset="100%" stop-color="#d7bea0"/>
    </radialGradient>
    <radialGradient id="pluto-disc" cx="44%" cy="38%" r="58%">
      <stop offset="0%" stop-color="#fbecd6" stop-opacity=".85"/>
      <stop offset="52%" stop-color="#6f2639" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#211321" stop-opacity=".05"/>
    </radialGradient>
    <radialGradient id="pluto-shadow" cx="58%" cy="34%" r="66%">
      <stop offset="0%" stop-color="#2b1729" stop-opacity=".24"/>
      <stop offset="78%" stop-color="#120b13" stop-opacity=".50"/>
      <stop offset="100%" stop-color="#120b13" stop-opacity="0"/>
    </radialGradient>
  `;
  graph.append(defs);
  graph.append(svg("rect", { x: 2, y: 2, width: 418, height: 809, rx: 6, class: "chart-bg" }));
  graph.append(svg("circle", { cx: 214, cy: 300, r: 206, class: "astro-ring" }));
  graph.append(svg("circle", { cx: 214, cy: 300, r: 162, class: "astro-ring inner" }));
  graph.append(svg("circle", { cx: 214, cy: 300, r: 118, class: "astro-ring faint" }));
  for (let i = 0; i < 32; i++) {
    const angle = i * 11.25;
    graph.append(svg("line", { x1:214, y1:79, x2:214, y2:i % 4 === 0 ? 91 : 86, class:"astro-tick", transform:`rotate(${angle} 214 300)` }));
  }
  graph.append(svg("circle", { cx: 214, cy: 248, r: 138, class: "pluto-disc" }));
  graph.append(svg("circle", { cx: 258, cy: 244, r: 116, class: "pluto-shadow" }));
  graph.append(svg("ellipse", { cx: 214, cy: 390, rx: 165, ry: 330, class: "orbit" }));
  graph.append(svg("ellipse", { cx: 214, cy: 390, rx: 126, ry: 275, class: "orbit inner" }));
  graph.append(svg("ellipse", { cx: 214, cy: 390, rx: 205, ry: 96, class: "orbit", transform: "rotate(-18 214 390)" }));
  [[54,160,1.2],[82,712,1.5],[116,96,1],[336,132,1.3],[372,376,1.1],[48,520,1.3],[356,688,1],[294,742,1.2]]
    .forEach(([cx, cy, r]) => graph.append(svg("circle", { cx, cy, r, class: "star-dust" })));
}

function activeGates(data) {
  const design = new Set(Object.values(data.Design || {}).map(v => v.Gate));
  const personality = new Set(Object.values(data.Personality || {}).map(v => v.Gate));
  return { design, personality, all: new Set([...design, ...personality]) };
}

function time24(hour, minute, ampm) {
  let h = Number(hour);
  if (h === 12) h = 0;
  if (ampm === "pm") h += 12;
  return `${String(h).padStart(2, "0")}:${String(Number(minute)).padStart(2, "0")}`;
}

async function getJson(url) {
  let target = url;
  if (location.protocol === "file:") target = "http://127.0.0.1:8789" + url;
  if (location.protocol !== "file:" && url.startsWith("/api/timezone")) {
    target = "https://api.myhumandesign.com/timezone?" + url.split("?")[1];
  }
  if (location.protocol !== "file:" && url.startsWith("/api/chart")) {
    target = "https://api.myhumandesign.com/chart/?apiKey=31e62c359ae2e2424b9b2ba47c569877&" + url.split("?")[1];
  }
  const res = await fetch(target);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

document.querySelector("#location").addEventListener("input", async (event) => {
  const q = event.target.value.trim();
  if (q.length < 3) return;
  const places = await getJson(`/api/timezone?q=${encodeURIComponent(q)}`);
  document.querySelector("#locations").innerHTML = places.map(p => `<option value="${p.value}" data-tz="${p.timezone}"></option>`).join("");
  const exact = places.find(p => p.value === q);
  if (exact) fields.timezone.value = exact.timezone;
});

document.querySelector("#chartForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#status");
  status.textContent = "Generating...";
  const date = `${fields.year.value}-${fields.month.value.padStart(2,"0")}-${fields.day.value.padStart(2,"0")} ${time24(fields.hour.value, fields.minute.value, fields.ampm.value)}`;
  const params = new URLSearchParams({ name: fields.name.value.trim(), location: fields.location.value.trim(), date, timezone: fields.timezone.value });
  try {
    const data = await getJson(`/api/chart?${params}`);
    if (!data.Properties) throw new Error("No chart data returned");
    lastData = data;
    render(data);
    status.textContent = "Done.";
  } catch (error) {
    status.textContent = `Failed: ${error.message}`;
  }
});

function render(data) {
  drawBase(data);
  document.querySelector("#personName").textContent = data.Properties.Name;
  document.querySelector("#birthLine").textContent = `${data.Properties.BirthDateLocal} in ${data.Properties.Location}`;
  document.querySelector("#designList").innerHTML = planets.map(p => row(p, data.Design[p])).join("");
  document.querySelector("#personalityList").innerHTML = planets.map(p => row(p, data.Personality[p])).join("");
  const keys = ["Type","Strategy","Inner Authority","Profile","Definition","Incarnation Cross","Not Self Theme","Digestion","Sense","Environment"];
  document.querySelector("#properties").innerHTML = keys.filter(k => data.Properties[k]).map(k => `<div class="property"><b>${k}</b>${data.Properties[k]}</div>`).join("");
}

function row(name, item) {
  return `<li><span>${name}</span><b>${item.Gate}.${item.Line}</b></li>`;
}

document.querySelector("#download").addEventListener("click", () => {
  const source = new XMLSerializer().serializeToString(graph);
  const img = new Image();
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1260; canvas.height = 2280;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffaf4"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.download = `${lastData?.Properties?.Name || "human-design"}-chart.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  img.src = url;
});

drawBase();
