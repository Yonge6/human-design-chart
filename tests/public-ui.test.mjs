import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("header tools are consolidated into an accessible side drawer", () => {
  const html = read("index.html");
  const css = read("style.css");
  const app = read("app.js");

  assert.match(html, /id="openMenu"[^>]*aria-controls="appDrawer"[^>]*aria-expanded="false"/);
  assert.match(html, /id="appDrawer"[^>]*class="drawer-layer"[^>]*hidden/);
  assert.match(html, /class="side-drawer"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="openHistory"[\s\S]*id="openSettings"[\s\S]*data-language="zh"[\s\S]*data-language="en"/);
  assert.match(html, /id="historyDialog"[^>]*class="drawer-subview drawer-history"[^>]*hidden/);
  assert.match(html, /id="settingsDialog"[^>]*class="drawer-subview drawer-settings"[^>]*hidden/);
  assert.match(css, /\.side-drawer \{[\s\S]*width: min\(88vw, 410px\);[\s\S]*height: 100dvh;/);
  assert.match(css, /@keyframes drawer-enter/);
  assert.match(app, /function openDrawer\(\)/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /function drawerFocusableElements\(\)/);
  assert.match(app, /new Set\(\["home", "about", "contact", "history", "settings"\]\)/);
  assert.doesNotMatch(app, /historyDialog\.showModal|settingsDialog\.showModal/);
});

test("drawer includes WonderElian information while support remains web-only", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.match(html, /id="openAbout"[\s\S]*id="openContact"/);
  assert.match(html, /id="drawerWorksTitle"[\s\S]*yixiu\.wonderelian\.com[\s\S]*xiazishuo\.com[\s\S]*wendao\.wonderelian\.com[\s\S]*style-atlas\.wonderelian\.com/);
  assert.match(app, /workYixiu: "一休冥想"[\s\S]*workYixiu: "Yixiu Meditation"/);
  assert.match(html, /id="drawerSupport"[^>]*hidden/);
  assert.match(html, /class="drawer-support-mark"[^>]*>喜<\/span>/);
  assert.match(html, /id="supportQr"[^>]*data-src=/);
  assert.doesNotMatch(html, /id="supportQr"[^>]*\ssrc=/);
  assert.match(app, /if \(nativeRuntime\) \{\s*drawerSupport\.remove\(\);\s*supportDialog\.remove\(\);/);
  assert.match(app, /drawerSupport\.hidden = false/);
});

test("history deletion requires the confirmation dialog", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.match(html, /id="deleteHistoryDialog"/);
  assert.match(html, /id="confirmHistoryDelete"/);
  assert.match(app, /deleteHistoryDialog\.showModal\(\)/);
  assert.match(app, /confirmHistoryDeleteButton\.addEventListener/);
  assert.doesNotMatch(app, /remove\.textContent\s*=\s*"×"/);
});

test("new defaults preserve explicit settings and destructive actions use in-app confirmation", () => {
  const html = read("index.html");
  const app = read("app.js");

  assert.match(app, /defaultSettings = \{ privacyByDefault: false, keepHistory: true/);
  assert.match(app, /defaultSettings = \{[^}]+\.\.\.DEFAULT_CONSENT/);
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
  const availability = read("src/app/release-feature-availability.js");

  assert.match(html, /id="localModeNotice"[^>]*role="status"/);
  assert.match(app, /const remoteRuntimeAllowed = canUseRemoteServices\(/);
  assert.match(app, /const releaseFeatures = getReleaseFeatureAvailability\(/);
  assert.match(app, /const remoteServicesAllowed = releaseFeatures\.remoteOperationsAllowed/);
  assert.match(app, /function currentConsent\(\) \{\s*return effectiveRemoteConsent/);
  assert.match(app, /function trackEvent[\s\S]{0,150}if \(!remoteServicesAllowed\) return/);
  assert.match(app, /if \(remoteServicesAllowed\) \{\s*saveChartToCloud/);
  assert.match(app, /cloudSaveSetting\.hidden = !releaseFeatures\.remoteSettingsVisible/);
  assert.match(app, /productAnalyticsSetting\.hidden = !releaseFeatures\.remoteSettingsVisible/);
  assert.match(app, /deleteCloudDataButton\.hidden = !releaseFeatures\.remoteSettingsVisible/);
  assert.match(app, /cloudSaveInput\.disabled = !remoteServicesAllowed/);
  assert.match(app, /productAnalyticsInput\.disabled = !remoteServicesAllowed/);
  assert.match(app, /deleteCloudDataButton\.disabled = !remoteServicesAllowed/);
  assert.match(availability, /isNativeRuntime && !hasSupabaseConfig/);
  assert.match(availability, /remoteOperationsAllowed: remoteRuntimeAllowed && remoteSettingsVisible/);
  assert.match(html, /id="cloudSaveSetting"[^>]*data-remote-setting/);
  assert.match(html, /id="productAnalyticsSetting"[^>]*data-remote-setting/);
  assert.match(html, /id="deleteCloudData"[^>]*data-remote-setting/);
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

test("web source keeps cache versions out of the HTTP hash fallback import chain", () => {
  assert.match(read("index.html"), /src="app\.js"/);
  assert.match(read("app.js"), /from "\.\/src\/engine\/profile-snapshot\.js"/);
  assert.match(read("src/engine/profile-snapshot.js"), /from "\.\/chart-hash\.js"/);
  assert.match(read("src/engine/chart-hash.js"), /from "\.\.\/\.\.\/shared\/human-design-profile-contract\.js"/);
  assert.match(read("shared/human-design-profile-contract.js"), /from "\.\.\/supabase\/functions\/_shared\/human-design-profile-contract\.js"/);
  for (const file of [
    "index.html",
    "app.js",
    "src/engine/human-design-engine.js",
    "src/engine/profile-snapshot.js",
    "src/engine/chart-hash.js",
    "shared/human-design-profile-contract.js",
  ]) {
    assert.doesNotMatch(read(file), /(?:\?|&)v=20\d{6}(?:-\d+)?/);
  }
});

test("mobile form remains vertically scrollable", () => {
  const css = read("style.css");

  assert.match(css, /\.shell\.form-view \{\s*height: auto;\s*min-height:[^;]+;\s*overflow: visible;/);
  assert.doesNotMatch(css, /\.shell\.form-view \{\s*height: calc\(100dvh - 58px\);\s*min-height: 0;\s*overflow: hidden;/);
  assert.match(css, /\.drawer-scroll \{[\s\S]*overflow-y: auto;/);
  assert.match(css, /\.drawer-settings \.settings-list \{ padding: 7px 0 0; \}/);
});

test("homepage uses a bilingual three-step form without the Life Philosophy poster", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("style.css");

  assert.match(html, /id="formProgressTrack"[^>]*role="progressbar"[^>]*aria-valuemax="3"/);
  assert.match(html, /data-form-step="1"[\s\S]*data-form-step="2"[\s\S]*data-form-step="3"/);
  assert.match(html, /id="nextToBirth"[\s\S]*id="nextToLocation"[\s\S]*type="submit"/);
  assert.match(app, /function setFormStep\(/);
  assert.match(app, /function currentBirthValidation\(/);
  assert.match(app, /stepBasic: "基本信息"[\s\S]*stepBasic: "Basics"/);
  assert.match(css, /\.form-progress-track/);
  assert.match(css, /\.form-action-dock/);
  assert.doesNotMatch(html, /homepage-poster|lifePhilosophyPoster|生命观海报/);
  assert.doesNotMatch(app, /lifePhilosophyPoster|life-philosophy-poster/);
  assert.doesNotMatch(css, /\.homepage-poster/);
});

test("result media keeps its nonblocking dark loading placeholder", () => {
  const app = read("app.js");
  const css = read("style.css");

  assert.match(app, /function clearPoster\(\)[\s\S]{0,500}setMediaState\(previewStage, "loading"\)/);
  assert.match(app, /setMediaState\(previewStage, "ready"\)/);
  assert.match(css, /\.media-loading-placeholder/);
  assert.match(css, /@keyframes pluto-placeholder-shimmer/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("Swiss Ephemeris files download in parallel before entering the WASM filesystem", () => {
  const swisseph = read("vendor/swisseph/swisseph-browser.js");

  assert.match(swisseph, /const downloads = await Promise\.all\(files\.map\(async \(file\) =>/);
  assert.match(swisseph, /for \(const \{ name, data \} of downloads\)/);
  assert.doesNotMatch(swisseph, /for \(const file of files\) \{\s*const response = await fetch\(file\.url\)/);
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

test("readings connect Human Design concepts to plain-language work and daily life", () => {
  const app = read("app.js");

  assert.match(app, /const typePracticalGuidanceZh =/);
  assert.match(app, /const typePracticalGuidanceEn =/);
  assert.match(app, /const authorityPracticalGuidanceZh =/);
  assert.match(app, /const authorityPracticalGuidanceEn =/);
  assert.match(app, /工作场景：\$\{practical\.work\}/);
  assert.match(app, /生活场景：\$\{practical\.life\}/);
  assert.match(app, /可以这样试：\$\{practical\.action\}/);
  assert.match(app, /Work example: \$\{practical\.work\}/);
  assert.match(app, /Daily-life example: \$\{practical\.life\}/);
  assert.match(app, /Try this: \$\{practical\.action\}/);
  assert.match(app, /收到新任务时/);
  assert.match(app, /In a meeting/);
  assert.match(app, /不把它当成科学定论或身份判决/);
  assert.match(app, /not a scientific conclusion or a verdict/);
  assert.match(app, /你的优势｜先看重点/);
  assert.match(app, /先看重点：你的三项核心优势/);
  assert.match(app, /YOUR STRENGTHS — THE MAIN POINT/);
  assert.match(app, /Your three core strengths/);
  assert.match(app, /核心能量优势：\$\{typeStrength\}/);
  assert.match(app, /Decision strength: \$\{authorityStrength\}/);
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

test("privacy copy matches the device-only defaults in both languages", () => {
  const app = read("app.js");
  const privacy = read("privacy.html");
  const dataMap = read("docs/privacy-data-map.md");

  assert.match(app, /生成图片时隐藏姓名、日期、时间和地点；默认关闭。/);
  assert.match(app, /默认开启，仅保存在本设备/);
  assert.match(app, /Hide name, date, time, and location in generated images\. Off by default\./);
  assert.match(app, /On by default and stored only on this device\./);
  assert.match(privacy, /Effective date: 2026-07-26/);
  assert.match(privacy, /本地历史开启不会导致任何云端上传/);
  assert.match(privacy, /Enabling local history never uploads data to the cloud/);
  assert.match(dataMap, /Local history[^\n]+Default on, device only[^\n]+Never unless separate cloud consent/);
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
