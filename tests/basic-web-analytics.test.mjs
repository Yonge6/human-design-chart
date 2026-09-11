import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../analytics.js", import.meta.url), "utf8");
function run({ hostname = "human-design.wonderelian.com", protocol = "https:", search = "?name=PRIVATE&birth=PRIVATE", native = false } = {}) {
  const scripts = [];
  const window = { location: { hostname, protocol, search }, Capacitor: { isNativePlatform: () => native } };
  vm.runInNewContext(source, { window, URLSearchParams, document: { createElement: () => ({}), head: { appendChild: (s) => scripts.push(s) } } });
  return { calls: Array.from(window.dataLayer || [], (args) => Array.from(args)), scripts };
}
test("basic web visits exclude sensitive URL context and keep advertising disabled", () => {
  const { calls, scripts } = run();
  assert.equal(scripts.length, 1);
  assert.equal(calls[0][2].analytics_storage, "granted");
  assert.equal(calls[0][2].ad_storage, "denied");
  const config = calls.find(([command]) => command === "config")[2];
  assert.equal(config.page_location, "https://human-design.wonderelian.com/");
  assert.equal(config.page_referrer, "");
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.cookie_expires, 2592000);
  assert.ok(!JSON.stringify(calls).includes("PRIVATE"));
  assert.equal(calls.filter(([command]) => command === "event").length, 0);
});
test("no basic web collection on native, preview, or insecure surfaces", () => {
  for (const options of [{ native: true }, { search: "?surface=ios" }, { hostname: "localhost" }, { protocol: "http:" }]) {
    const result = run(options);
    assert.equal(result.scripts.length, 0);
    assert.equal(result.calls.length, 0);
  }
});
test("chart events still require explicit product analytics permission", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /if \(!remoteServicesAllowed \|\| appSettings.productAnalytics !== true \|\| typeof window.gtag !== "function"\) return;/);
  assert.ok(!app.includes('window.gtag("consent", "update"'));
});
