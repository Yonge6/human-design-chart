import { calculateHumanDesign } from "./human-design-engine.js";

const planets = ["Sun", "Earth", "North Node", "South Node", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
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

const centerColors = {
  "head-center": "#a8a27c",
  "ajna-center": "#777168",
  "throat-center": "#b58b63",
  "g-center": "#ddbf70",
  "heart-center": "#c8afbd",
  "sacral-center": "#b8756e",
  "splenic-center": "#ad8764",
  "solar-plexus-center": "#a995b6",
  "root-center": "#c29d6b",
};

let graphTemplate;
let lastData;
let locationResults = [];

function time24(hour, minute, ampm) {
  let value = Number(hour);
  if (value === 12) value = 0;
  if (ampm === "pm") value += 12;
  return { hour: value, minute: Number(minute) };
}

async function loadGraphTemplate() {
  if (!graphTemplate) {
    const response = await fetch("./assets/bodygraph-template.svg");
    if (!response.ok) throw new Error("BodyGraph template failed to load");
    graphTemplate = await response.text();
  }
  graph.innerHTML = graphTemplate;
  const svg = graph.querySelector("svg");
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Human Design BodyGraph");
  return svg;
}

function activeGates(data) {
  const design = new Set(Object.values(data.Design || {}).map((value) => value.Gate));
  const personality = new Set(Object.values(data.Personality || {}).map((value) => value.Gate));
  return { design, personality, all: new Set([...design, ...personality]) };
}

async function paintBodygraph(data) {
  const svg = await loadGraphTemplate();
  const active = activeGates(data);

  svg.querySelectorAll("[data-gate-number]").forEach((label) => {
    const gate = Number(label.dataset.gateNumber);
    const marker = label.previousElementSibling;
    const isActive = active.all.has(gate);
    if (marker) {
      marker.style.fill = isActive ? "#2b2430" : "#f7ecdc";
      marker.style.stroke = isActive ? "#b88a51" : "#cbbca8";
    }
    label.style.fill = isActive ? "#fbefdc" : "#503d3d";
  });

  svg.querySelectorAll("[data-gate-line]").forEach((line) => {
    const gate = Number(line.dataset.gateLine);
    const hasDesign = active.design.has(gate);
    const hasPersonality = active.personality.has(gate);
    if (hasDesign && hasPersonality) {
      line.style.fill = line.dataset.gateLineType === "design" ? "#8c3040" : "#302936";
    } else if (hasDesign) {
      line.style.fill = "#8c3040";
    } else if (hasPersonality) {
      line.style.fill = "#302936";
    } else {
      line.style.fill = "transparent";
    }
  });

  Object.entries(centerColors).forEach(([id]) => {
    const center = svg.querySelector(`#${id}`);
    if (!center) return;
    center.style.fill = "rgba(249, 238, 221, .94)";
    center.style.stroke = "#a87945";
  });
  for (const centerName of data["Defined Centers"] || []) {
    const id = centerName.replace(/\s+/g, "-");
    const center = svg.querySelector(`#${id}`);
    if (center) center.style.fill = centerColors[id];
  }
}

function row(name, item) {
  const iconClass = `wb-${name.replaceAll(" ", "-")}`;
  return `<li><span><i class="${iconClass}" aria-hidden="true"></i>${name}</span><b>${item.Gate}.${item.Line}</b></li>`;
}

function render(data) {
  paintBodygraph(data);
  document.querySelector("#personName").textContent = data.Properties.Name;
  document.querySelector("#birthLine").textContent = `${data.Properties.BirthDateLocal} in ${data.Properties.Location}`;
  document.querySelector("#designList").innerHTML = planets.map((planet) => row(planet, data.Design[planet])).join("");
  document.querySelector("#personalityList").innerHTML = planets.map((planet) => row(planet, data.Personality[planet])).join("");
  const keys = ["Type", "Strategy", "Inner Authority", "Profile", "Definition", "Incarnation Cross", "Not Self Theme", "Digestion", "Sense", "Environment"];
  document.querySelector("#properties").innerHTML = keys.map((key) => `<div class="property"><b>${key}</b>${data.Properties[key]}</div>`).join("");
}

async function lookupLocations(query) {
  const response = await fetch(`https://api.myhumandesign.com/timezone?q=${encodeURIComponent(query)}`);
  if (!response.ok) return [];
  return response.json();
}

let locationRequest;
fields.location.addEventListener("input", () => {
  clearTimeout(locationRequest);
  const query = fields.location.value.trim();
  if (query.length < 2) return;
  locationRequest = setTimeout(async () => {
    locationResults = await lookupLocations(query);
    const datalist = document.querySelector("#locations");
    datalist.replaceChildren(...locationResults.map((place) => {
      const option = document.createElement("option");
      option.value = place.value;
      return option;
    }));
    const exact = locationResults.find((place) => place.value === fields.location.value.trim());
    if (exact) fields.timezone.value = exact.timezone;
  }, 180);
});

fields.location.addEventListener("change", () => {
  const exact = locationResults.find((place) => place.value === fields.location.value.trim());
  if (exact) fields.timezone.value = exact.timezone;
});

document.querySelector("#chartForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#status");
  const submit = event.submitter;
  status.textContent = "Calculating planetary positions...";
  submit.disabled = true;
  const time = time24(fields.hour.value, fields.minute.value, fields.ampm.value);
  try {
    const data = await calculateHumanDesign({
      name: fields.name.value.trim(),
      location: fields.location.value.trim(),
      year: Number(fields.year.value),
      month: Number(fields.month.value),
      day: Number(fields.day.value),
      hour: time.hour,
      minute: time.minute,
      timezone: fields.timezone.value,
    });
    lastData = data;
    render(data);
    status.textContent = "Chart calculated locally with Swiss Ephemeris.";
  } catch (error) {
    console.error(error);
    status.textContent = `Failed: ${error.message}`;
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#download").addEventListener("click", async () => {
  if (!lastData) return;
  const status = document.querySelector("#status");
  status.textContent = "Preparing PNG...";
  const svg = graph.querySelector("svg");
  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1266;
    canvas.height = 2439;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f5e7d2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.download = `${lastData.Properties.Name || "human-design"}-bodygraph.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    status.textContent = "PNG downloaded.";
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    status.textContent = "PNG export failed.";
  };
  image.src = url;
});

loadGraphTemplate().catch((error) => {
  document.querySelector("#status").textContent = error.message;
});
