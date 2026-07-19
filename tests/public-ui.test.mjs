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

test("privacy-first defaults and destructive actions use in-app confirmation", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.match(app, /defaultSettings = \{ privacyByDefault: true, keepHistory: false/);
  assert.match(app, /hasStoredKeepHistory = Object\.prototype\.hasOwnProperty\.call\(storedSettings, "keepHistory"\)/);
  assert.match(app, /historyEntries\.length && !hasStoredKeepHistory/);
  assert.match(html, /id="confirmationDialog"/);
  assert.match(html, /id="historyOptOutDialog"/);
  assert.match(html, /id="keepHistoryRecords"/);
  assert.match(html, /id="deleteHistoryRecords"/);
  assert.match(app, /requestConfirmation\(\{/);
  assert.match(app, /choice === "cancel"[\s\S]*saveHistoryInput\.checked = true/);
  assert.match(app, /choice === "delete"[\s\S]*historyEntries = \[\];[\s\S]*persistHistory\(\)/);
  assert.doesNotMatch(app, /window\.confirm\(/);
});

test("insecure runtimes expose local-only mode and bypass every backend operation", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.match(html, /id="localModeNotice"[^>]*role="status"/);
  assert.match(app, /const remoteServicesAllowed = canUseRemoteServices\(/);
  assert.match(app, /function currentConsent\(\) \{\s*return effectiveRemoteConsent/);
  assert.match(app, /function trackEvent[\s\S]{0,150}if \(!remoteServicesAllowed\) return/);
  assert.match(app, /if \(remoteServicesAllowed\) \{\s*saveChartToCloud/);
  assert.match(app, /cloudSaveInput\.disabled = !remoteServicesAllowed/);
  assert.match(app, /productAnalyticsInput\.disabled = !remoteServicesAllowed/);
  assert.match(app, /deleteCloudDataButton\.disabled = !remoteServicesAllowed/);
});

test("birth selectors start empty and use shared validation", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.doesNotMatch(app, /appendOptions\(fields\.year[^\n]*1997/);
  assert.doesNotMatch(app, /fields\.day\.value = "07"/);
  assert.match(app, /validateBirthSelection\(\{/);
  assert.match(html, /id="ampm" name="ampm" type="hidden" value=""/);
  assert.match(html, /data-ampm="am"[^>]*aria-pressed="false"/);
  assert.match(html, /data-ampm="pm"[^>]*aria-pressed="false"/);
  assert.match(app, /function initializeSelectors\(\)[\s\S]{0,1200}applyAmPmSelection\(fields\.ampm, ampmButtons, ""\)/);
  assert.doesNotMatch(app, /function initializeSelectors\(\)[\s\S]{0,1200}fields\.ampm\.value = "am"/);
  assert.match(app, /function hydrateForm\(input\)[\s\S]{0,1200}applyAmPmSelection\(fields\.ampm, ampmButtons, input\.ampm\)/);
  assert.match(app, /validation\.field === "ampm"[\s\S]{0,300}ampmButtons\[0\]\.focus\(\)/);
});

test("the HTTP hash fallback import chain is cache-versioned", () => {
  const appVersion = "20260718-4";
  const engineChainVersion = "20260718-3";

  assert.match(read("index.html"), new RegExp(`app\\.js\\?v=${appVersion}`));
  assert.match(read("app.js"), new RegExp(`profile-snapshot\\.js\\?v=${engineChainVersion}`));
  assert.match(read("src/engine/profile-snapshot.js"), new RegExp(`chart-hash\\.js\\?v=${engineChainVersion}`));
  assert.match(read("src/engine/chart-hash.js"), new RegExp(`human-design-profile-contract\\.js\\?v=${engineChainVersion}`));
  assert.match(read("shared/human-design-profile-contract.js"), new RegExp(`human-design-profile-contract\\.js\\?v=${engineChainVersion}`));
});

test("mobile form remains vertically scrollable", () => {
  const css = read("style.css");

  assert.match(css, /\.shell\.form-view \{\s*height: auto;\s*min-height:[^;]+;\s*overflow: visible;/);
  assert.doesNotMatch(css, /\.shell\.form-view \{\s*height: calc\(100dvh - 58px\);\s*min-height: 0;\s*overflow: hidden;/);
  assert.match(css, /\.settings-dialog \{ overflow-y: auto; \}/);
});

test("result has an accessible summary and social discovery metadata", () => {
  const html = read("index.html");
  const app = read("app.js");

  const resultSection = html.match(/<section id="resultSummary"[^>]*>/)?.[0] || "";
  assert.match(resultSection, /aria-labelledby="resultSummaryTitle"/);
  assert.match(resultSection, /tabindex="-1"/);
  assert.doesNotMatch(resultSection, /role="status"/);
  assert.doesNotMatch(resultSection, /aria-live=/);
  assert.doesNotMatch(resultSection, /aria-hidden=/);
  assert.match(html, /id="resultSummary"[\s\S]*<h2[^>]*id="resultSummaryTitle"/);
  assert.match(html, /id="resultSummary"[\s\S]*<dl>[\s\S]*<dt[\s\S]*<dd/);
  assert.match(html, /id="summaryAuthority"/);
  assert.match(html, /id="summarySignature"/);
  assert.match(html, /id="summaryNotSelf"/);
  assert.match(html, /aria-describedby="resultSummary"/);
  assert.match(app, /resultSummary\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /chartPreview\.alt = language === "zh"/);
  assert.match(app, /const resultSummaryFields = \{[\s\S]*\bSign: document\.querySelector\("#summarySignature"\)/);
  assert.doesNotMatch(app, /\bSignature: document\.querySelector\("#summarySignature"\)/);
  assert.doesNotMatch(app, /properties\.Signature/);
  assert.match(html, /class="form-disclaimer"[\s\S]*href="legal\.html"/);
  assert.match(html, /rel="canonical" href="https:\/\/human-design\.wonderelian\.com\/"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /assets\/pluto-og-1200x630\.png/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(read("robots.txt"), /sitemap\.xml/);
  assert.match(read("sitemap.xml"), /human-design\.wonderelian\.com/);
});

test("public pages expose source, license, and build provenance", () => {
  const index = read("index.html");
  const legal = read("legal.html");

  assert.match(index, /github\.com\/Yonge6\/human-design-chart/i);
  assert.match(legal, /github\.com\/Yonge6\/human-design-chart/i);
  assert.match(index, /data-build-version/);
  assert.match(index, /data-build-commit/);
  assert.match(index, /AGPL-3\.0-or-later/);
  assert.match(read("index.html"), /data-i18n="legalNotice">法律声明</);
});

test("sharing falls back visibly when system sharing is unavailable", () => {
  const html = read("index.html");
  const app = read("app.js");
  const sharing = read("src/services/sharing-service.js");

  assert.match(html, /data-share-label/);
  assert.match(sharing, /export async function copyText/);
  assert.match(sharing, /execCommand\("copy"\)/);
  assert.match(sharing, /export function isEmbeddedBrowser/);
  assert.match(sharing, /export function canUseSystemShare/);
  assert.match(app, /openingShareShort/);
  assert.match(app, /const result = await shareLink\(t\("shareReadingText"\)\)/);
  assert.match(app, /result === "cancelled"/);
  assert.match(app, /downloadPoster\(\);\n\s+setStatus\("downloaded"\)/);
});

test("cloud saving and anonymous analytics are explicit opt-ins", () => {
  const html = read("index.html");
  const app = read("app.js");
  const backend = read("src/services/backend-service.js");

  assert.match(html, /id="cloudSave" type="checkbox"/);
  assert.match(html, /id="productAnalytics" type="checkbox"/);
  assert.match(app, /\.\.\.DEFAULT_CONSENT/);
  assert.match(backend, /cloudSave: false/);
  assert.match(backend, /productAnalytics: false/);
  assert.match(html, /id="deleteCloudData"/);
  assert.match(html, /删除云端图谱与个人资料/);
  assert.match(app, /Delete Cloud Charts and Personal Data/);
  assert.match(app, /匿名使用事件会移除用户标识，并最多保留180天/);
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
