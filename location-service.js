const MAINLAND_MARKERS = [
  "中国", "中华人民共和国",
  "北京", "天津", "上海", "重庆",
  "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南",
  "广东", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "内蒙古", "广西", "西藏", "宁夏", "新疆",
];

const COUNTRY_CODES = {
  CHN: "CN",
  HKG: "HK",
  MAC: "MO",
  TWN: "TW",
};

function compactAddress(value) {
  return value.trim().replace(/[\s,，、/]+/g, "");
}

export function inferTimezoneFromAddress(value) {
  const address = compactAddress(value);
  if (!address) return null;
  if (/香港|Hong\s*Kong/i.test(value)) return "Asia/Hong_Kong";
  if (/澳门|澳門|Macao|Macau/i.test(value)) return "Asia/Macau";
  if (/台湾|臺灣|Taiwan/i.test(value)) return "Asia/Taipei";
  if (MAINLAND_MARKERS.some((marker) => address.includes(marker))) return "Asia/Shanghai";
  return null;
}

export function preparePhotonQuery(query) {
  const spaced = query.trim().replace(/([省市区县州旗])(?=[\u3400-\u9fff])/g, "$1 ");
  const timezone = inferTimezoneFromAddress(query);
  if (timezone === "Asia/Shanghai" && !/中国|中华人民共和国/.test(query)) return `${spaced} 中国`;
  return spaced;
}

export function arcgisCandidatesToFeatures(data) {
  return (data.candidates || []).map((candidate) => {
    const attributes = candidate.attributes || {};
    const countrycode = COUNTRY_CODES[attributes.Country] || attributes.Country || "";
    return {
      type: "Feature",
      properties: {
        name: candidate.address,
        district: attributes.District,
        city: attributes.City,
        state: attributes.Region,
        country: attributes.Country,
        countrycode,
        score: candidate.score,
      },
      geometry: {
        type: "Point",
        coordinates: [candidate.location?.x, candidate.location?.y],
      },
    };
  }).filter((feature) => feature.geometry.coordinates.every(Number.isFinite));
}

async function photonSearch(query, language, signal, fetchImpl) {
  const url = new URL("https://photon.komoot.io/api/");
  const params = { q: preparePhotonQuery(query), limit: "7" };
  if (language === "en") params.lang = "en";
  url.search = new URLSearchParams(params);
  const response = await fetchImpl(url, { signal });
  if (!response.ok) throw new Error("Photon unavailable");
  const data = await response.json();
  return data.features || [];
}

async function arcgisSearch(query, signal, fetchImpl) {
  const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
  url.search = new URLSearchParams({
    SingleLine: query,
    maxLocations: "7",
    outFields: "Addr_type,Country,Region,City,District",
    forStorage: "false",
    f: "json",
  });
  const response = await fetchImpl(url, { signal });
  if (!response.ok) throw new Error("ArcGIS unavailable");
  return arcgisCandidatesToFeatures(await response.json());
}

function delayedSearch(callback, delay, signal) {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => callback().then(resolve, reject), delay);
    signal?.addEventListener("abort", () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export async function fetchPlaceCandidates(query, { language = "en", signal, fetchImpl = fetch, fallbackDelay = 900 } = {}) {
  const attempts = [
    photonSearch(query, language, signal, fetchImpl),
    delayedSearch(() => arcgisSearch(query, signal, fetchImpl), fallbackDelay, signal),
  ];

  return new Promise((resolve, reject) => {
    let failures = 0;
    let lastError;
    attempts.forEach((attempt) => attempt.then((features) => {
      if (features.length) {
        resolve(features);
        return;
      }
      failures += 1;
      if (failures === attempts.length) resolve([]);
    }).catch((error) => {
      failures += 1;
      lastError = error;
      if (failures === attempts.length) reject(lastError);
    }));
  });
}
