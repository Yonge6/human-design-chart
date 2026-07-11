import { calculateHumanDesign, localToUtcCandidates } from "./human-design-engine.js?v=20260711-3";

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
  clockOccurrence: document.querySelector("#clockOccurrence"),
};
const locationResults = document.querySelector("#locationResults");
const clockOccurrenceField = document.querySelector("#clockOccurrenceField");
const status = document.querySelector("#status");
const chartForm = document.querySelector("#chartForm");
const downloadButton = document.querySelector("#download");

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
let placeQueryVersion = 0;
let selectedPlace = {
  label: "Shanghai, China",
  coordinates: [121.4737, 31.2304],
  timezone: "Asia/Shanghai",
};

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

function resetClockOccurrence() {
  clockOccurrenceField.hidden = true;
  fields.clockOccurrence.value = "earlier";
}

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function selectPlace(index) {
  const place = placeMatches[index];
  if (!place) return;
  const [longitude, latitude] = place.geometry.coordinates;
  if (![longitude, latitude].every(Number.isFinite)) return;
  // Mainland Chinese civil records use China Standard Time nationwide.
  const timezone = place.properties.countrycode === "CN" ? "Asia/Shanghai" : window.tzlookup(latitude, longitude);
  if (!isValidTimezone(timezone)) return;
  const label = placeLabel(place.properties);
  fields.location.value = label;
  selectedPlace = { label, coordinates: [longitude, latitude], timezone };
  fields.location.removeAttribute("aria-invalid");
  placeRequest?.abort();
  resetClockOccurrence();
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
  if (placeMatches.length) {
    status.textContent = "";
    highlightPlace(0);
  } else {
    status.textContent = "No matching place found. Try city, region, and country.";
  }
}

async function searchPlaces(query, queryVersion) {
  placeRequest?.abort();
  const request = new AbortController();
  placeRequest = request;
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    request.abort();
  }, 8000);
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.search = new URLSearchParams({ q: query, limit: "7", osm_tag: "place", lang: "default" });
    const response = await fetch(url, { signal: request.signal });
    if (!response.ok) throw new Error("Place search unavailable");
    const data = await response.json();
    if (queryVersion !== placeQueryVersion || fields.location.value.trim() !== query) return;
    renderPlaceResults(data.features || []);
  } catch (error) {
    if ((error.name !== "AbortError" || timedOut) && queryVersion === placeQueryVersion) {
      closePlaceResults();
      status.textContent = "Location search unavailable. Check your connection and try again.";
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

function cancelPlaceSearch() {
  placeQueryVersion += 1;
  placeRequest?.abort();
  closePlaceResults();
}

fields.location.addEventListener("input", () => {
  window.clearTimeout(placeTimer);
  placeRequest?.abort();
  placeQueryVersion += 1;
  selectedPlace = null;
  placeMatches = [];
  locationResults.replaceChildren();
  closePlaceResults();
  resetClockOccurrence();
  fields.location.removeAttribute("aria-invalid");
  status.textContent = "";
  const query = fields.location.value.trim();
  if (query.length < 2) {
    closePlaceResults();
    return;
  }
  const queryVersion = placeQueryVersion;
  placeTimer = window.setTimeout(() => searchPlaces(query, queryVersion), 280);
});

fields.location.addEventListener("keydown", (event) => {
  if (event.isComposing) return;
  if (locationResults.hidden) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightPlace(activePlaceIndex + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightPlace(activePlaceIndex - 1);
  } else if (event.key === "Enter" && placeMatches.length > 0) {
    event.preventDefault();
    selectPlace(activePlaceIndex >= 0 ? activePlaceIndex : 0);
  } else if (event.key === "Escape") {
    cancelPlaceSearch();
  }
});

fields.location.addEventListener("blur", () => window.setTimeout(cancelPlaceSearch, 120));

function time24(hour, minute, ampm) {
  let value = Number(hour);
  if (value === 12) value = 0;
  if (ampm === "pm") value += 12;
  return { hour: value, minute: Number(minute) };
}

async function loadGraphTemplate() {
  if (!graphTemplate) {
    const response = await fetch("./assets/bodygraph-template.svg?v=20260711-3");
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

async function render(data) {
  await paintBodygraph(data);
  document.querySelector("#personName").textContent = data.Properties.Name;
  document.querySelector("#birthLine").textContent = `${data.Properties.BirthDateLocal} in ${data.Properties.Location}`;
  document.querySelector("#designList").innerHTML = planets.map((planet) => row(planet, data.Design[planet])).join("");
  document.querySelector("#personalityList").innerHTML = planets.map((planet) => row(planet, data.Personality[planet])).join("");
  const keys = ["Type", "Strategy", "Inner Authority", "Profile", "Definition", "Incarnation Cross", "Not Self Theme", "Digestion", "Sense", "Environment"];
  document.querySelector("#properties").innerHTML = keys.map((key) => `<div class="property"><b>${key}</b>${data.Properties[key]}</div>`).join("");
  downloadButton.disabled = false;
}

function invalidateChart() {
  if (!lastData) return;
  lastData = undefined;
  downloadButton.disabled = true;
  document.querySelector("#personName").textContent = "-";
  document.querySelector("#birthLine").textContent = "Enter details to generate.";
  document.querySelector("#designList").replaceChildren();
  document.querySelector("#personalityList").replaceChildren();
  document.querySelector("#properties").replaceChildren();
  paintBodygraph({ Design: {}, Personality: {}, "Defined Centers": [] }).catch((error) => {
    status.textContent = error.message;
  });
}

fields.year.addEventListener("change", updateDays);
fields.month.addEventListener("change", updateDays);
[fields.year, fields.month, fields.day, fields.hour, fields.minute, fields.ampm].forEach((field) => field.addEventListener("change", resetClockOccurrence));
chartForm.addEventListener("input", invalidateChart);
chartForm.addEventListener("change", invalidateChart);

chartForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = event.submitter || document.querySelector("#chartForm button[type='submit']");
  if (submit.disabled) return;
  if (!selectedPlace || fields.location.value.trim() !== selectedPlace.label) {
    fields.location.setAttribute("aria-invalid", "true");
    fields.location.focus();
    status.textContent = "Select a birth location from the search results.";
    return;
  }
  const name = fields.name.value.trim();
  if (!name) {
    fields.name.setAttribute("aria-invalid", "true");
    fields.name.focus();
    status.textContent = "Enter a name.";
    return;
  }
  fields.name.removeAttribute("aria-invalid");
  const time = time24(fields.hour.value, fields.minute.value, fields.ampm.value);
  try {
    const candidates = localToUtcCandidates(
      Number(fields.year.value), Number(fields.month.value), Number(fields.day.value),
      time.hour, time.minute, selectedPlace.timezone,
    );
    if (!candidates.length) throw new RangeError("This local birth time did not exist because the clocks moved forward.");
    if (candidates.length > 1 && clockOccurrenceField.hidden) {
      clockOccurrenceField.hidden = false;
      status.textContent = "This clock time occurred twice. Choose which occurrence is on the birth record.";
      fields.clockOccurrence.focus();
      return;
    }
    const selectedUtc = fields.clockOccurrence.value === "later" ? candidates[candidates.length - 1] : candidates[0];
    if (selectedUtc > Date.now()) throw new RangeError("Birth date and time cannot be in the future.");
    status.textContent = "Calculating planetary positions...";
    submit.disabled = true;
    const data = await calculateHumanDesign({
      name,
      location: selectedPlace.label,
      year: Number(fields.year.value),
      month: Number(fields.month.value),
      day: Number(fields.day.value),
      hour: time.hour,
      minute: time.minute,
      timezone: selectedPlace.timezone,
      timeDisambiguation: fields.clockOccurrence.value,
    });
    await render(data);
    lastData = data;
    status.textContent = "Chart calculated locally with Swiss Ephemeris.";
  } catch (error) {
    console.error(error);
    status.textContent = `Failed: ${error.message}`;
  } finally {
    submit.disabled = false;
  }
});

downloadButton.addEventListener("click", async () => {
  if (!lastData) return;
  status.textContent = "Preparing PNG...";
  downloadButton.disabled = true;
  try {
    const canvas = await window.html2canvas(document.querySelector("#capture"), {
      backgroundColor: "#ead5b8",
      logging: false,
      scale: 2,
      useCORS: true,
      windowWidth: 1200,
      onclone: (documentClone) => {
        const panel = documentClone.querySelector("#capture");
        panel.style.width = "1128px";
        panel.style.maxWidth = "none";
        documentClone.querySelector("#download").disabled = false;
      },
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Canvas could not be encoded");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (lastData.Properties.Name || "human-design")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .trim()
      .slice(0, 80) || "human-design";
    link.download = `${safeName}-human-design-chart.png`;
    link.href = url;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "PNG downloaded.";
  } catch (error) {
    console.error(error);
    status.textContent = `PNG export failed: ${error.message}`;
  } finally {
    downloadButton.disabled = !lastData;
  }
});

paintBodygraph({ Design: {}, Personality: {}, "Defined Centers": [] }).catch((error) => {
  document.querySelector("#status").textContent = error.message;
});
initializeSelectors();
