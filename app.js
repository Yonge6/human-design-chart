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
const locationResults = document.querySelector("#locationResults");
const defaultTimezones = ["Asia/Shanghai", "Asia/Hong_Kong", "Asia/Taipei", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "Etc/UTC"];

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
let placeMatches = [];
let activePlaceIndex = -1;
let placeTimer;
let placeRequest;

function appendOptions(select, values, selected) {
  select.replaceChildren(...values.map(({ value, label }) => {
    const option = document.createElement("option");
    const formatted = String(value).padStart(2, "0");
    option.value = formatted;
    option.textContent = label ?? formatted;
    option.selected = String(value) === String(selected);
    return option;
  }));
}

function updateDays() {
  const year = Number(fields.year.value || 1990);
  const month = Number(fields.month.value || 1);
  const previous = Math.min(Number(fields.day.value || 1), new Date(year, month, 0).getDate());
  const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => ({ value: index + 1 }));
  appendOptions(fields.day, days, previous);
}

function initializeSelectors() {
  const currentYear = new Date().getFullYear();
  appendOptions(fields.year, Array.from({ length: currentYear - 1899 }, (_, index) => ({ value: currentYear - index })), 1990);
  appendOptions(fields.month, Array.from({ length: 12 }, (_, index) => ({ value: index + 1 })), 1);
  appendOptions(fields.hour, Array.from({ length: 12 }, (_, index) => ({ value: index + 1 })), 12);
  appendOptions(fields.minute, Array.from({ length: 60 }, (_, index) => ({ value: index })), 0);
  updateDays();

  const timezones = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : defaultTimezones;
  fields.timezone.replaceChildren(...timezones.map((timezone) => {
    const option = document.createElement("option");
    option.value = timezone;
    option.textContent = timezone.replaceAll("_", " ").replace("/", " / ");
    option.selected = timezone === "Asia/Shanghai";
    return option;
  }));
}

function placeLabel(properties) {
  const parts = [properties.name, properties.district, properties.city, properties.county, properties.state, properties.country];
  return parts.filter((part, index) => part && parts.indexOf(part) === index).join(", ");
}

function closePlaceResults() {
  locationResults.hidden = true;
  fields.location.setAttribute("aria-expanded", "false");
  fields.location.removeAttribute("aria-activedescendant");
  activePlaceIndex = -1;
}

function highlightPlace(index) {
  const options = [...locationResults.children];
  if (!options.length) return;
  activePlaceIndex = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => {
    const isActive = optionIndex === activePlaceIndex;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-selected", String(isActive));
  });
  fields.location.setAttribute("aria-activedescendant", options[activePlaceIndex].id);
  options[activePlaceIndex].scrollIntoView({ block: "nearest" });
}

function setTimezone(timezone) {
  let option = [...fields.timezone.options].find((item) => item.value === timezone);
  if (!option) {
    option = document.createElement("option");
    option.value = timezone;
    option.textContent = timezone.replaceAll("_", " ").replace("/", " / ");
    fields.timezone.append(option);
  }
  fields.timezone.value = timezone;
}

function selectPlace(index) {
  const place = placeMatches[index];
  if (!place) return;
  const [longitude, latitude] = place.geometry.coordinates;
  fields.location.value = placeLabel(place.properties);
  setTimezone(window.tzlookup(latitude, longitude));
  closePlaceResults();
}

function renderPlaceResults(features) {
  const labels = new Set();
  placeMatches = features.filter((place) => {
    const label = placeLabel(place.properties);
    if (!label || labels.has(label)) return false;
    labels.add(label);
    return true;
  });
  locationResults.replaceChildren(...placeMatches.map((place, index) => {
    const option = document.createElement("li");
    option.id = `location-option-${index}`;
    option.role = "option";
    option.tabIndex = -1;
    const label = placeLabel(place.properties);
    const [primary, ...context] = label.split(", ");
    const name = document.createElement("strong");
    const detail = document.createElement("span");
    name.textContent = primary;
    detail.textContent = context.join(" · ");
    option.append(name, detail);
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => selectPlace(index));
    return option;
  }));
  locationResults.hidden = placeMatches.length === 0;
  fields.location.setAttribute("aria-expanded", String(placeMatches.length > 0));
  activePlaceIndex = -1;
}

async function searchPlaces(query) {
  placeRequest?.abort();
  placeRequest = new AbortController();
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.search = new URLSearchParams({ q: query, limit: "7", osm_tag: "place", lang: "default" });
    const response = await fetch(url, { signal: placeRequest.signal });
    if (!response.ok) throw new Error("Place search unavailable");
    const data = await response.json();
    renderPlaceResults(data.features || []);
  } catch (error) {
    if (error.name !== "AbortError") closePlaceResults();
  }
}

fields.location.addEventListener("input", () => {
  window.clearTimeout(placeTimer);
  const query = fields.location.value.trim();
  if (query.length < 2) {
    closePlaceResults();
    return;
  }
  placeTimer = window.setTimeout(() => searchPlaces(query), 280);
});

fields.location.addEventListener("keydown", (event) => {
  if (locationResults.hidden) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightPlace(activePlaceIndex + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightPlace(activePlaceIndex - 1);
  } else if (event.key === "Enter" && activePlaceIndex >= 0) {
    event.preventDefault();
    selectPlace(activePlaceIndex);
  } else if (event.key === "Escape") {
    closePlaceResults();
  }
});

fields.location.addEventListener("blur", () => window.setTimeout(closePlaceResults, 120));

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

fields.year.addEventListener("change", updateDays);
fields.month.addEventListener("change", updateDays);

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
initializeSelectors();
