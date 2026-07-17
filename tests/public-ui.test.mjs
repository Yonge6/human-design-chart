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

test("sharing falls back visibly when system sharing is unavailable", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.match(html, /data-share-label/);
  assert.match(app, /async function copyText\(text\)/);
  assert.match(app, /document\.execCommand\("copy"\)/);
  assert.match(app, /function isEmbeddedBrowser\(\)/);
  assert.match(app, /function canUseSystemShare\(\)/);
  assert.match(app, /openingShareShort/);
  assert.match(app, /const result = await shareLink\(t\("shareReadingText"\)\)/);
  assert.match(app, /result === "cancelled"/);
  assert.match(app, /downloadPoster\(\);\n\s+setStatus\("downloaded"\)/);
});

test("dialog controls use consistent fixed dimensions", () => {
  const css = read("style.css");

  assert.match(css, /\.confirm-dialog-actions button \{[^}]*height: 44px;/s);
  assert.match(css, /\.settings-links a \{[^}]*height: 44px;/s);
  assert.match(css, /\.danger-button \{[^}]*height: 44px;/s);
  assert.match(css, /\.dialog-close \{[^}]*width: 36px;[^}]*height: 36px;/s);
});

test("poster reading modules use legible mobile export type", () => {
  const css = read("style.css");

  assert.match(css, /\.chart-panel\.export-mobile #interpretationText \{[^}]*font: 11\.5px\/1\.78/s);
  assert.match(css, /\.chart-panel\.export-mobile \.celebrity-card p \{[^}]*font: 9px\/1\.55/s);
});
