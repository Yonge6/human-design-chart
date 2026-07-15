import { calculateHumanDesign, localToUtcCandidates } from "./human-design-engine.js?v=20260712-9";
import { fetchPlaceCandidates, inferTimezoneFromAddress } from "./location-service.js?v=20260715-2";

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
const editButton = document.querySelector("#editChart");
const shell = document.querySelector(".shell");
const formPanel = document.querySelector(".form-panel");
const chartPanel = document.querySelector("#capture");
const chartResult = document.querySelector("#chartResult");
const chartPreview = document.querySelector("#chartPreview");
const chartQr = document.querySelector("#chartQr");
const privacyToggle = document.querySelector("#privacyMode");
const navCreate = document.querySelector("#navCreate");
const navChart = document.querySelector("#navChart");
const languageButtons = [...document.querySelectorAll("[data-language]")];

const copy = {
  zh: {
    navCreate: "创建人类图", navChart: "我的人类图",
    formEyebrow: "人类图", formTitle: "生成你的人类图", name: "姓名", year: "年", month: "月", day: "日",
    hour: "时", minute: "分", ampm: "上午/下午", am: "上午", pm: "下午", birthLocation: "出生地点",
    locationPlaceholder: "城市、区县或地区", locationSuggestions: "出生地点建议", clockOccurrence: "重复时刻",
    navLabel: "主导航", bodygraphLabel: "人类图身体图",
    firstOccurrence: "第一次出现", secondOccurrence: "第二次出现", attribution: "可直接输入完整地点，无需选择候选。",
    generate: "生成人类图", yourChart: "你的人类图", emptyChart: "填写出生资料后生成。", editChart: "重新填写", download: "下载 图片", previewAlt: "人类图海报",
    design: "设计", personality: "人格", watermark: "Swiss Ephemeris · 精确 88° 太阳弧", interpretationTitle: "解读", qrLabel: "扫码生成你的人类图", privacyMode: "隐私模式",
    searchingPlace: "正在搜索地点…", noPlace: "暂未显示候选，仍可直接点击生成人类图。", placeUnavailable: "搜索建议暂时未加载，仍可直接点击生成人类图。",
    resolvingPlace: "正在确认地点和当地时间…", placeNeedsDetail: "暂时无法确认这个地点，请补充城市、省/州和国家后再试。", enterName: "请输入姓名。",
    missingTime: "该出生时刻因夏令时向前调整而不存在。", repeatedTime: "这个时刻出现过两次，请选择出生记录对应的那一次。",
    futureTime: "出生日期和时间不能晚于现在。", calculating: "正在计算行星位置…", calculated: "已使用 Swiss Ephemeris 在本地完成计算。",
    failed: "计算失败：{message}", preparing: "正在生成图片…", downloaded: "图片已下载。", exportFailed: "图片导出失败：{message}",
  },
  en: {
    navCreate: "Create Chart", navChart: "My Chart",
    formEyebrow: "Human Design Chart", formTitle: "Get Your Human Design Chart", name: "Name", year: "Year", month: "Month", day: "Day",
    hour: "Hour", minute: "Minute", ampm: "AM/PM", am: "AM", pm: "PM", birthLocation: "Birth location",
    locationPlaceholder: "City, district or region", locationSuggestions: "Birth location suggestions", clockOccurrence: "Clock occurrence",
    navLabel: "Primary", bodygraphLabel: "Human Design bodygraph",
    firstOccurrence: "First occurrence", secondOccurrence: "Second occurrence", attribution: "Enter the full place directly; selecting a suggestion is optional.",
    generate: "Generate Chart", yourChart: "Your Chart", emptyChart: "Enter details to generate.", editChart: "Edit Details", download: "Download Image", previewAlt: "Human Design chart poster",
    design: "Design", personality: "Personality", watermark: "Swiss Ephemeris · exact 88° solar arc", interpretationTitle: "Reading", qrLabel: "Scan to create your chart", privacyMode: "Privacy mode",
    searchingPlace: "Searching locations…", noPlace: "No suggestions yet. You can still generate the chart directly.", placeUnavailable: "Suggestions did not load. You can still generate the chart directly.",
    resolvingPlace: "Confirming the place and its local time…", placeNeedsDetail: "We could not confirm this place. Add the city, state or region, and country, then try again.", enterName: "Enter a name.",
    missingTime: "This local birth time did not exist because the clocks moved forward.", repeatedTime: "This clock time occurred twice. Choose which occurrence is on the birth record.",
    futureTime: "Birth date and time cannot be in the future.", calculating: "Calculating planetary positions…", calculated: "Chart calculated locally with Swiss Ephemeris.",
    failed: "Failed: {message}", preparing: "Preparing image…", downloaded: "Image downloaded.", exportFailed: "Image export failed: {message}",
  },
};

const planetNames = {
  Sun: "太阳", Earth: "地球", "North Node": "北交点", "South Node": "南交点", Moon: "月亮", Mercury: "水星",
  Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
};
const propertyNames = {
  Type: "类型", Strategy: "策略", "Inner Authority": "内在权威", Profile: "人生角色", Definition: "定义",
  "Incarnation Cross": "轮回交叉", "Not Self Theme": "非自己主题", Digestion: "消化", Sense: "感知", Environment: "环境",
};
const valueNames = {
  Generator: "生产者", "Manifesting Generator": "显示生产者", Manifestor: "显现者", Projector: "投射者", Reflector: "反映者",
  "To Respond": "等待回应", "To Inform": "告知", "Wait for the Invitation": "等待邀请", "Wait a Lunar Cycle": "等待一个月亮周期",
  "Emotional - Solar Plexus": "情绪权威 · 太阳神经丛", Sacral: "荐骨权威", Splenic: "脾脏权威", "Ego Manifested": "意志显现权威",
  "Ego Projected": "意志投射权威", "Self-Projected": "自我投射权威", Lunar: "月亮权威", "Mental - Environment": "环境权威",
  "No Definition": "无定义", "Single Definition": "一分人", "Split Definition": "二分人", "Triple Split Definition": "三分人", "Quadruple Split Definition": "四分人",
  Frustration: "挫败", Anger: "愤怒", Bitterness: "苦涩", Disappointment: "失望",
  "Consecutive Appetite": "连续食欲", "Alternating Appetite": "交替食欲", "Open Taste": "开放味觉", "Closed Taste": "封闭味觉",
  "Hot Thirst": "热渴", "Cold Thirst": "冷渴", "Calm Touch": "平静触觉", "Nervous Touch": "紧张触觉", "High Sound": "高声音", "Low Sound": "低声音",
  "Direct Light": "直接光", "Indirect Light": "间接光", Smell: "嗅觉", Taste: "味觉", "Outer Vision": "外在视觉", "Inner Vision": "内在视觉",
  Feeling: "感觉", Touch: "触觉", Caves: "洞穴", Markets: "市场", Kitchens: "厨房", Mountains: "山脉", Valleys: "山谷", Shores: "海岸",
};
const profileRoles = { Investigator: "研究者", Martyr: "体验者", Opportunist: "机会主义者", Hermit: "隐士", Heretic: "异端者", "Role Model": "榜样" };
const strategyGuidance = {
  "To Respond": "等待身体对眼前的人和事产生明确回应",
  "To Inform": "行动前先告知可能受影响的人",
  "Wait for the Invitation": "等待自己被看见，再接受真正合适的邀请",
  "Wait a Lunar Cycle": "给自己一个完整的月亮周期看清答案",
};
const authorityGuidance = {
  "Emotional - Solar Plexus": "不必当场答应，等情绪波浪平稳后再确认",
  Sacral: "留意身体当下自然出现的“愿意”或“不愿意”",
  Splenic: "相信当下安静、短暂却清楚的直觉",
  "Ego Manifested": "先确认自己是否真心想要，并愿意为它投入",
  "Ego Projected": "在正确的邀请中，听听自己真正想要什么",
  "Self-Projected": "把选择说出来，从自己的声音里听见方向",
  Lunar: "不急着定论，让不同时刻的感受帮你看清全貌",
  "Mental - Environment": "去到让自己舒服的环境，在值得信任的人面前说出想法",
};
const definitionGuidance = {
  "No Definition": "你会明显感受环境和他人的影响，给决定多一点时间很重要",
  "Single Definition": "你的内在运作较连贯，独处时也容易把事情想明白",
  "Split Definition": "你的不同部分常在交流和连接中被串起来，合适的互动会带来启发",
  "Triple Split Definition": "你需要在不同关系与场景间流动，思路才更容易慢慢整合",
  "Quadruple Split Definition": "你有多个相对独立的处理区块，给自己充足时间会更从容",
};
let language = localStorage.getItem("pluto-language") || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
let statusState;

function t(key, values = {}) {
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), copy[language][key] || key);
}

function setStatus(key, values = {}) {
  statusState = key ? { key, values } : null;
  status.textContent = key ? t(key, values) : "";
}

function translatedValue(key, value) {
  if (language !== "zh") return value;
  if (key === "Profile") {
    return value.replace(/(Investigator|Martyr|Opportunist|Hermit|Heretic|Role Model)/g, (role) => profileRoles[role]);
  }
  if (key === "Incarnation Cross") {
    return value
      .replace(/^Right Angle Cross of /, "右角度交叉 · ")
      .replace(/^Left Angle Cross of /, "左角度交叉 · ")
      .replace(/^Juxtaposition Cross of /, "并列交叉 · ");
  }
  return valueNames[value] || value;
}

function interpretation(data) {
  const properties = data.Properties;
  if (language === "en") {
    return `As a ${properties.Type}, you work best when you follow your strategy: ${properties.Strategy.toLowerCase()}. Let your ${properties["Inner Authority"]} authority guide important choices instead of outside pressure. Your ${properties.Profile} profile learns its own reliable way through real experience. When ${properties["Not Self Theme"].toLowerCase()} keeps appearing, pause and return to the pace that feels genuinely right for you.\n\nYour ${properties.Definition.toLowerCase()} describes how your inner processing connects. Also notice ${properties.Digestion.toLowerCase()}, ${properties.Sense.toLowerCase()}, and ${properties.Environment.toLowerCase()}: they point to a comfortable way of taking things in, a sensory strength, and supportive surroundings. Treat them as observation prompts, not rigid rules. Tracking what feels clear and sustainable over time is more useful than chasing a perfect answer.`;
  }
  const type = translatedValue("Type", properties.Type);
  const profile = properties.Profile.split(":", 1)[0];
  const theme = translatedValue("Not Self Theme", properties["Not Self Theme"]);
  const strategy = strategyGuidance[properties.Strategy] || translatedValue("Strategy", properties.Strategy);
  const authority = authorityGuidance[properties["Inner Authority"]] || `依照${translatedValue("Inner Authority", properties["Inner Authority"])}做选择`;
  const definition = definitionGuidance[properties.Definition] || `你的${translatedValue("Definition", properties.Definition)}描述了内在信息如何连接`;
  const digestion = translatedValue("Digestion", properties.Digestion);
  const sense = translatedValue("Sense", properties.Sense);
  const environment = translatedValue("Environment", properties.Environment);
  return `你是${type}，更适合${strategy}，不必急着迎合外界。重要选择时，${authority}。你的${profile}人生角色会让你从亲身经历中形成自己的方法。若常感到${theme}，就停一下，回到适合自己的节奏。\n\n${definition}。日常还可以留意${digestion}、${sense}和${environment}三条线索：它们分别对应较舒服的接收方式、感知优势和环境偏好。把这些当作观察自己的提示，不必变成僵硬规则；持续记录真实感受，往往比追求标准答案更有帮助。`;
}

function formattedBirth(data) {
  if (language === "en" || !data.Meta?.BirthIso) return `${data.Properties.BirthDateLocal} in ${data.Properties.Location}`;
  const date = new Intl.DateTimeFormat("zh-CN", {
    timeZone: data.Meta.Timezone, year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(data.Meta.BirthIso));
  return `${date} · ${data.Properties.Location}`;
}

function privateBirthLine() {
  return language === "zh" ? "****年**月**日 **:** · ********" : "****-**-** **:** · ********";
}

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
let posterBlob;
let posterUrl;
let posterRenderVersion = 0;
let placeMatches = [];
let placeLabels = [];
let activePlaceIndex = -1;
let placeTimer;
let placeRequest;
let placeQueryVersion = 0;
const placeCache = new Map();
let selectedPlace = null;

function appendOptions(select, values, selected, includePlaceholder = true) {
  const options = values.map(({ value, label }) => {
    const option = document.createElement("option");
    const formatted = String(value).padStart(2, "0");
    option.value = formatted;
    option.textContent = label ?? formatted;
    option.selected = String(value) === String(selected);
    return option;
  });
  if (includePlaceholder) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "--";
    placeholder.disabled = true;
    placeholder.selected = selected === null || selected === undefined || selected === "";
    options.unshift(placeholder);
  }
  select.replaceChildren(...options);
}

function updateDays() {
  const year = Number(fields.year.value);
  const month = Number(fields.month.value);
  if (!year || !month) {
    appendOptions(fields.day, [], null);
    return;
  }
  const currentDay = Number(fields.day.value);
  const previous = currentDay ? Math.min(currentDay, new Date(year, month, 0).getDate()) : null;
  const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => ({ value: index + 1 }));
  appendOptions(fields.day, days, previous);
}

function initializeSelectors() {
  const currentYear = new Date().getFullYear();
  appendOptions(fields.year, Array.from({ length: currentYear - 1899 }, (_, index) => ({ value: currentYear - index })), null);
  appendOptions(fields.month, Array.from({ length: 12 }, (_, index) => ({ value: index + 1 })), null);
  appendOptions(fields.hour, Array.from({ length: 12 }, (_, index) => ({ value: index + 1 })), null);
  appendOptions(fields.minute, Array.from({ length: 60 }, (_, index) => ({ value: index })), null);
  updateDays();
}

function placeLabel(properties) {
  const parts = [properties.name, properties.district, properties.city, properties.county, properties.state, properties.country];
  return parts.filter((part, index) => part && parts.indexOf(part) === index).join(", ");
}

function resultLabel(place, query) {
  const fallback = placeLabel(place.properties);
  if (place.properties.countrycode !== "CN" || !/[\u3400-\u9fff]/.test(query)) return fallback;
  return query.trim().replace(/[\s,，、/]+/g, ", ");
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
  const label = placeLabels[index] || placeLabel(place.properties);
  const timezone = inferTimezoneFromAddress(label)
    || (place.properties.countrycode === "CN" ? "Asia/Shanghai" : window.tzlookup(latitude, longitude));
  if (!isValidTimezone(timezone)) return;
  fields.location.value = label;
  selectedPlace = { label, coordinates: [longitude, latitude], timezone };
  fields.location.removeAttribute("aria-invalid");
  placeRequest?.abort();
  resetClockOccurrence();
  closePlaceResults();
}

function renderPlaceResults(features, query) {
  const labels = new Set();
  placeMatches = features.filter((place) => {
    const label = resultLabel(place, query);
    if (!label || labels.has(label)) return false;
    labels.add(label);
    return true;
  });
  placeLabels = placeMatches.map((place) => resultLabel(place, query));
  locationResults.replaceChildren(...placeMatches.map((place, index) => {
    const option = document.createElement("li");
    option.id = `location-option-${index}`;
    option.role = "option";
    option.tabIndex = -1;
    const label = placeLabels[index];
    const [primary, ...context] = label.split(", ");
    const name = document.createElement("strong");
    const detail = document.createElement("span");
    name.textContent = primary;
    detail.textContent = context.join(" · ");
    option.append(name, detail);
    option.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      selectPlace(index);
    });
    return option;
  }));
  locationResults.hidden = placeMatches.length === 0;
  fields.location.setAttribute("aria-expanded", String(placeMatches.length > 0));
  activePlaceIndex = -1;
  if (placeMatches.length) {
    setStatus(null);
    highlightPlace(0);
  } else {
    setStatus("noPlace");
  }
}

async function searchPlaces(query, queryVersion) {
  const cacheKey = `${language}:${query}`;
  if (placeCache.has(cacheKey)) {
    renderPlaceResults(placeCache.get(cacheKey), query);
    return;
  }
  placeRequest?.abort();
  const request = new AbortController();
  placeRequest = request;
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    request.abort();
  }, 12000);
  try {
    const features = await fetchPlaceCandidates(query, { language, signal: request.signal });
    if (queryVersion !== placeQueryVersion || fields.location.value.trim() !== query) return;
    placeCache.set(cacheKey, features);
    renderPlaceResults(features, query);
  } catch (error) {
    if ((error.name !== "AbortError" || timedOut) && queryVersion === placeQueryVersion) {
      closePlaceResults();
      setStatus("placeUnavailable");
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
  placeLabels = [];
  locationResults.replaceChildren();
  closePlaceResults();
  resetClockOccurrence();
  fields.location.removeAttribute("aria-invalid");
  setStatus(null);
  const query = fields.location.value.trim();
  if (query.length < 2) {
    closePlaceResults();
    return;
  }
  setStatus("searchingPlace");
  const queryVersion = placeQueryVersion;
  placeTimer = window.setTimeout(() => searchPlaces(query, queryVersion), 360);
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

fields.location.addEventListener("blur", () => window.setTimeout(closePlaceResults, 180));

function selectionFromPlace(place, label) {
  const [longitude, latitude] = place.geometry.coordinates;
  if (![longitude, latitude].every(Number.isFinite)) return null;
  const timezone = inferTimezoneFromAddress(label)
    || (place.properties.countrycode === "CN" ? "Asia/Shanghai" : window.tzlookup(latitude, longitude));
  if (!isValidTimezone(timezone)) return null;
  return { label, coordinates: [longitude, latitude], timezone };
}

async function resolveTypedPlace(query) {
  const inferredTimezone = inferTimezoneFromAddress(query);
  if (inferredTimezone) return { label: query, coordinates: null, timezone: inferredTimezone };

  setStatus("resolvingPlace");
  fields.location.setAttribute("aria-busy", "true");
  window.clearTimeout(placeTimer);
  placeQueryVersion += 1;
  closePlaceResults();
  placeRequest?.abort();
  const request = new AbortController();
  placeRequest = request;
  try {
    const cached = placeCache.get(`${language}:${query}`);
    const matches = cached?.length ? cached : await fetchPlaceCandidates(query, {
      language,
      signal: request.signal,
      fallbackDelay: 0,
    });
    const resolved = matches.map((place) => selectionFromPlace(place, query)).find(Boolean);
    if (resolved) {
      selectedPlace = resolved;
      fields.location.removeAttribute("aria-invalid");
      return resolved;
    }
  } catch (error) {
    if (error.name === "AbortError") return null;
  } finally {
    fields.location.removeAttribute("aria-busy");
  }

  fields.location.setAttribute("aria-invalid", "true");
  fields.location.focus();
  setStatus("placeNeedsDetail");
  return null;
}

function time24(hour, minute, ampm) {
  let value = Number(hour);
  if (value === 12) value = 0;
  if (ampm === "pm") value += 12;
  return { hour: value, minute: Number(minute) };
}

async function decodeImage(image) {
  if (image.decode) await image.decode();
  else if (!image.complete) await new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", reject, { once: true });
  });
}

async function loadExportAssets() {
  const background = new Image();
  background.src = "./assets/pluto-chart-mobile-v1.png";
  await Promise.all([decodeImage(background), decodeImage(chartQr)]);
}

async function loadGraphTemplate() {
  if (!graphTemplate) {
    const response = await fetch("./assets/bodygraph-template.svg?v=20260712-9");
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
  const label = language === "zh" ? planetNames[name] : name;
  return `<li><span><i class="${iconClass}" aria-hidden="true"></i><em>${label}</em></span><b>${item.Gate}.${item.Line}</b></li>`;
}

async function render(data) {
  await paintBodygraph(data);
  document.querySelector("#personName").textContent = privacyToggle.checked ? "***" : data.Properties.Name;
  document.querySelector("#birthLine").textContent = privacyToggle.checked ? privateBirthLine() : formattedBirth(data);
  document.querySelector("#designList").innerHTML = planets.map((planet) => row(planet, data.Design[planet])).join("");
  document.querySelector("#personalityList").innerHTML = planets.map((planet) => row(planet, data.Personality[planet])).join("");
  const keys = ["Type", "Strategy", "Inner Authority", "Profile", "Definition", "Incarnation Cross", "Not Self Theme", "Digestion", "Sense", "Environment"];
  document.querySelector("#properties").innerHTML = keys.map((key) => {
    const label = language === "zh" ? propertyNames[key] : key;
    return `<div class="property"><b>${label}</b><span>${translatedValue(key, data.Properties[key])}</span></div>`;
  }).join("");
  document.querySelector("#interpretationText").textContent = interpretation(data);
}

function clearPoster() {
  posterRenderVersion += 1;
  posterBlob = undefined;
  if (posterUrl) URL.revokeObjectURL(posterUrl);
  posterUrl = undefined;
  chartPreview.removeAttribute("src");
  chartResult.removeAttribute("aria-busy");
  downloadButton.disabled = true;
  privacyToggle.disabled = false;
  languageButtons.forEach((button) => { button.disabled = false; });
}

async function createPosterImage() {
  const renderVersion = ++posterRenderVersion;
  chartResult.setAttribute("aria-busy", "true");
  downloadButton.disabled = true;
  privacyToggle.disabled = true;
  languageButtons.forEach((button) => { button.disabled = true; });
  try {
    await Promise.all([document.fonts.ready, loadExportAssets()]);
    const canvas = await window.html2canvas(chartPanel, {
      backgroundColor: "#0d0b12",
      logging: false,
      scale: 2,
      useCORS: true,
      windowWidth: 660,
      scrollX: 0,
      scrollY: 0,
      onclone: (documentClone) => {
        const source = documentClone.querySelector("#capture");
        source.classList.remove("capture-source");
        source.style.position = "static";
      },
    });
    const nextBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!nextBlob) throw new Error("Canvas could not be encoded");
    if (renderVersion !== posterRenderVersion) return;
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    posterBlob = nextBlob;
    posterUrl = URL.createObjectURL(nextBlob);
    chartPreview.src = posterUrl;
    if (chartPreview.decode) await chartPreview.decode();
    downloadButton.disabled = false;
  } finally {
    if (renderVersion === posterRenderVersion) {
      chartResult.removeAttribute("aria-busy");
      privacyToggle.disabled = false;
      languageButtons.forEach((button) => { button.disabled = false; });
    }
  }
}

function showFormView() {
  setStatus(null);
  closePlaceResults();
  chartResult.hidden = true;
  formPanel.hidden = false;
  shell.classList.remove("result-view");
  shell.classList.add("form-view");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showChartView() {
  formPanel.hidden = true;
  chartResult.hidden = false;
  shell.classList.remove("form-view");
  shell.classList.add("result-view");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function applyLanguage(nextLanguage, rerender = true) {
  language = nextLanguage === "en" ? "en" : "zh";
  localStorage.setItem("pluto-language", language);
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = language === "zh" ? "Pluto 人类图" : "Pluto Human Design Chart";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.alt = t(element.dataset.i18nAlt);
  });
  fields.location.placeholder = t("locationPlaceholder");
  locationResults.setAttribute("aria-label", t("locationSuggestions"));
  document.querySelector(".topbar nav").setAttribute("aria-label", t("navLabel"));
  graph.setAttribute("aria-label", t("bodygraphLabel"));
  graph.querySelector("svg")?.setAttribute("aria-label", t("bodygraphLabel"));
  languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
  if (statusState) status.textContent = t(statusState.key, statusState.values);
  if (rerender && lastData) {
    render(lastData)
      .then(createPosterImage)
      .catch((error) => { setStatus("exportFailed", { message: error.message }); });
  }
}

languageButtons.forEach((button) => button.addEventListener("click", () => applyLanguage(button.dataset.language)));
privacyToggle.addEventListener("change", () => {
  if (!lastData) return;
  render(lastData)
    .then(createPosterImage)
    .catch((error) => { setStatus("exportFailed", { message: error.message }); });
});
editButton.addEventListener("click", showFormView);
navCreate.addEventListener("click", (event) => {
  event.preventDefault();
  showFormView();
});
navChart.addEventListener("click", (event) => {
  event.preventDefault();
  if (!lastData) return;
  showChartView();
});

function invalidateChart() {
  if (!lastData) return;
  lastData = undefined;
  clearPoster();
  document.querySelector("#personName").textContent = "-";
  document.querySelector("#birthLine").textContent = t("emptyChart");
  document.querySelector("#designList").replaceChildren();
  document.querySelector("#personalityList").replaceChildren();
  document.querySelector("#properties").replaceChildren();
  document.querySelector("#interpretationText").textContent = "";
  paintBodygraph({ Design: {}, Personality: {}, "Defined Centers": [] }).catch((error) => {
    setStatus("failed", { message: error.message });
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
  const name = fields.name.value.trim();
  if (!name) {
    fields.name.setAttribute("aria-invalid", "true");
    fields.name.focus();
    setStatus("enterName");
    return;
  }
  fields.name.removeAttribute("aria-invalid");
  const time = time24(fields.hour.value, fields.minute.value, fields.ampm.value);
  submit.disabled = true;
  try {
    const locationQuery = fields.location.value.trim();
    const place = selectedPlace?.label === locationQuery ? selectedPlace : await resolveTypedPlace(locationQuery);
    if (!place) return;
    selectedPlace = place;
    const candidates = localToUtcCandidates(
      Number(fields.year.value), Number(fields.month.value), Number(fields.day.value),
      time.hour, time.minute, place.timezone,
    );
    if (!candidates.length) throw new RangeError(t("missingTime"));
    if (candidates.length > 1 && clockOccurrenceField.hidden) {
      clockOccurrenceField.hidden = false;
      setStatus("repeatedTime");
      fields.clockOccurrence.focus();
      return;
    }
    const selectedUtc = fields.clockOccurrence.value === "later" ? candidates[candidates.length - 1] : candidates[0];
    if (selectedUtc > Date.now()) throw new RangeError(t("futureTime"));
    setStatus("calculating");
    const data = await calculateHumanDesign({
      name,
      location: place.label,
      year: Number(fields.year.value),
      month: Number(fields.month.value),
      day: Number(fields.day.value),
      hour: time.hour,
      minute: time.minute,
      timezone: place.timezone,
      timeDisambiguation: fields.clockOccurrence.value,
    });
    await render(data);
    lastData = data;
    setStatus("preparing");
    await createPosterImage();
    setStatus("calculated");
    showChartView();
  } catch (error) {
    console.error(error);
    setStatus("failed", { message: error.message });
  } finally {
    submit.disabled = false;
  }
});

downloadButton.addEventListener("click", async () => {
  if (!lastData || !posterBlob || !posterUrl) return;
  const exportData = lastData;
  downloadButton.disabled = true;
  try {
    const link = document.createElement("a");
    const fileName = privacyToggle.checked ? "private" : (exportData.Properties.Name || "human-design");
    const safeName = fileName
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .trim()
      .slice(0, 80) || "human-design";
    link.download = `${safeName}-human-design-chart.png`;
    link.href = posterUrl;
    document.body.append(link);
    link.click();
    link.remove();
    setStatus("downloaded");
  } catch (error) {
    console.error(error);
    setStatus("exportFailed", { message: error.message });
  } finally {
    downloadButton.disabled = !lastData || !posterBlob;
  }
});

paintBodygraph({ Design: {}, Personality: {}, "Defined Centers": [] }).catch((error) => {
  setStatus("failed", { message: error.message });
});
initializeSelectors();
applyLanguage(language, false);
