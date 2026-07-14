import assert from "node:assert/strict";
import test from "node:test";

import {
  arcgisCandidatesToFeatures,
  fetchPlaceCandidates,
  inferTimezoneFromAddress,
  preparePhotonQuery,
} from "../location-service.js";

test("Chinese civil-time fallbacks work without a geocoder response", () => {
  assert.equal(inferTimezoneFromAddress("湖南省湘潭市雨湖区"), "Asia/Shanghai");
  assert.equal(inferTimezoneFromAddress("中国上海市浦东新区"), "Asia/Shanghai");
  assert.equal(inferTimezoneFromAddress("香港九龙"), "Asia/Hong_Kong");
  assert.equal(inferTimezoneFromAddress("澳門花地瑪堂區"), "Asia/Macau");
  assert.equal(inferTimezoneFromAddress("臺灣台北市"), "Asia/Taipei");
  assert.equal(inferTimezoneFromAddress("Paris, France"), null);
});

test("Photon queries add boundaries and country context for mainland Chinese addresses", () => {
  assert.equal(preparePhotonQuery("湖南省湘潭市雨湖区"), "湖南省 湘潭市 雨湖区 中国");
  assert.equal(preparePhotonQuery("Paris, France"), "Paris, France");
});

test("ArcGIS candidates are normalized to the app's GeoJSON shape", () => {
  const [feature] = arcgisCandidatesToFeatures({
    candidates: [{
      address: "湖南省湘潭市雨湖区",
      location: { x: 112.902, y: 27.86 },
      score: 100,
      attributes: { District: "雨湖区", City: "湘潭市", Region: "湖南省", Country: "CHN" },
    }],
  });
  assert.deepEqual(feature.geometry.coordinates, [112.902, 27.86]);
  assert.equal(feature.properties.countrycode, "CN");
  assert.equal(feature.properties.city, "湘潭市");
});

test("the backup provider resolves an address when Photon returns no matches", async () => {
  const requestedHosts = [];
  const fetchImpl = async (url) => {
    requestedHosts.push(url.hostname);
    if (url.hostname === "photon.komoot.io") {
      return { ok: true, json: async () => ({ features: [] }) };
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          address: "Brooklyn, New York, United States",
          location: { x: -73.95, y: 40.65 },
          score: 100,
          attributes: { District: "Brooklyn", City: "New York", Region: "New York", Country: "USA" },
        }],
      }),
    };
  };

  const features = await fetchPlaceCandidates("Brooklyn, New York, USA", { fetchImpl, fallbackDelay: 0 });
  assert.equal(features[0].properties.city, "New York");
  assert.deepEqual(requestedHosts.sort(), ["geocode.arcgis.com", "photon.komoot.io"]);
});
