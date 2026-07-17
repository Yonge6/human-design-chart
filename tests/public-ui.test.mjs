import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("history deletion requires the confirmation dialog", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.match(html, /id="deleteHistoryDialog"/);
  assert.match(html, /id="confirmHistoryDelete"/);
  assert.match(app, /deleteHistoryDialog\.showModal\(\)/);
  assert.match(app, /confirmHistoryDeleteButton\.addEventListener/);
  assert.doesNotMatch(app, /remove\.textContent\s*=\s*"×"/);
});

test("public pages keep legal notices without exposing the source repository", () => {
  const pages = ["index.html", "legal.html", "privacy.html", "support.html", "app.js"];

  for (const page of pages) {
    assert.doesNotMatch(read(page), /github\.com\/Yonge6\/human-design-chart/i, page);
  }
  assert.match(read("index.html"), /data-i18n="legalNotice">法律声明</);
});
