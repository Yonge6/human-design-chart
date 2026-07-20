import { expect, test } from "@playwright/test";

const settingsKey = "pluto-app-settings-v1";
const historyKey = "pluto-chart-history-v1";

const historyEntry = {
  id: "history-fixture",
  createdAt: 1_700_000_000_000,
  data: {
    Properties: {
      Name: "History Fixture",
      Location: "Xiangtan, Hunan, China",
      BirthDateLocal: "1990-01-01 12:00",
      Type: "Generator",
      Profile: "2/4: Hermit / Opportunist",
    },
    Meta: {
      BirthIso: "1990-01-01T04:00:00.000Z",
      Timezone: "Asia/Shanghai",
    },
  },
  input: {
    name: "History Fixture",
    year: 1990,
    month: 1,
    day: 1,
    hour: "12",
    minute: "00",
    ampm: "pm",
    location: "Xiangtan, Hunan, China",
    place: { label: "Xiangtan, Hunan, China", timezone: "Asia/Shanghai" },
  },
};

async function stubExternalNetwork(page, requests = []) {
  page.on("request", (request) => requests.push(request.url()));
  await page.route("https://**", (route) => route.abort());
  await page.route("https://photon.komoot.io/**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q") || "";
    const isWuhan = /wuhan/i.test(query);
    const place = isWuhan
      ? { name: "Wuhan", city: "Wuhan", state: "Hubei", coordinates: [114.305, 30.593] }
      : { name: "Xiangtan", city: "Xiangtan", state: "Hunan", coordinates: [112.944, 27.829] };
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        features: [{
          type: "Feature",
          properties: { name: place.name, city: place.city, state: place.state, country: "China", countrycode: "CN" },
          geometry: { type: "Point", coordinates: place.coordinates },
        }],
      }),
    });
  });
  await page.route("https://geocode.arcgis.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ candidates: [] }),
  }));
  await page.route(/https:\/\/(api-human-design\.wonderelian\.com|[^/]+\.supabase\.co)\/.*/, (route) => route.abort());
}

async function selectBirth(page, { includeDate = true, includeTime = true, ampm = "pm" } = {}) {
  if (includeDate) {
    await page.locator("#year").selectOption("1990");
    await page.locator("#month").selectOption("01");
    await page.locator("#day").selectOption("01");
  }
  if (includeTime) {
    await page.locator("#hour").selectOption("12");
    await page.locator("#minute").selectOption("00");
  }
  if (ampm) await page.locator(`[data-ampm="${ampm}"]`).click();
}

async function fillAndGenerate(page) {
  await page.locator("#name").fill("Browser Fixture");
  await selectBirth(page);
  await page.locator("#location").fill("Xiangtan");
  await expect(page.locator("#locationResults")).toBeVisible();
  await page.locator("#locationResults [role=option]").first().click();
  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator("#chartResult")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#summaryType")).not.toHaveText("");
}

async function fillProductionFixtureAndGenerate(page) {
  await page.locator("#name").fill("Production Smoke Test");
  await selectBirth(page);
  await page.locator("#location").fill("Wuhan, China");
  await expect(page.locator("#locationResults")).toBeVisible();
  await page.locator("#locationResults [role=option]").first().click();
  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator("#chartResult")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#summaryType")).not.toHaveText("");
}

test.beforeEach(async ({ page }) => {
  await stubExternalNetwork(page);
});

test("new-user defaults keep history locally and require every birth field", async ({ page }) => {
  await page.goto("/");
  for (const selector of ["#year", "#month", "#day", "#hour", "#minute", "#ampm"]) {
    await expect(page.locator(selector)).toHaveValue("");
  }
  await expect(page.locator('[data-ampm="am"]')).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[data-ampm="pm"]')).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#defaultPrivacy")).not.toBeChecked();
  await expect(page.locator("#privacyMode")).not.toBeChecked();
  await expect(page.locator("#saveHistory")).toBeChecked();
  await expect(page.locator("#cloudSave")).not.toBeChecked();
  await expect(page.locator("#productAnalytics")).not.toBeChecked();

  await page.locator("#name").fill("Validation Fixture");
  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator("#year")).toBeFocused();
  await expect(page.locator("#year")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#year").selectOption("1990");
  await expect(page.locator("#year")).not.toHaveAttribute("aria-invalid", "true");

  await page.locator("#month").selectOption("01");
  await page.locator("#day").selectOption("01");
  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator("#hour")).toBeFocused();
  await expect(page.locator("#hour")).toHaveAttribute("aria-invalid", "true");

  await page.locator("#hour").selectOption("12");
  await page.locator("#minute").selectOption("00");
  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator('[data-ampm="am"]')).toBeFocused();
  await expect(page.locator("#ampmSwitch")).toHaveAttribute("aria-invalid", "true");
  await page.locator('[data-ampm="am"]').click();
  await expect(page.locator("#ampmSwitch")).not.toHaveAttribute("aria-invalid", "true");

  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator("#location")).toBeFocused();
  await expect(page.locator("#location")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#location").fill("Xiangtan");
  await expect(page.locator("#location")).not.toHaveAttribute("aria-invalid", "true");
});

test("a new user's generated chart is saved locally without backend requests", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await fillAndGenerate(page);

  const history = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "[]"), historyKey);
  expect(history).toHaveLength(1);
  expect(history[0].data.Properties.Name).toBe("Browser Fixture");
  expect(requests.some((url) => /supabase\.co|api-human-design\.wonderelian\.com/.test(url))).toBe(false);
});

test("mobile form and settings dialog scroll naturally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto("/");
  const submit = page.locator("#chartForm button[type=submit]");
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);

  await page.locator("#openSettings").click();
  const dialog = page.locator("#settingsDialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await dialog.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await dialog.evaluate((element) => element.scrollTop > 0)).toBe(true);
});

test("an explicit disabled history setting is not overwritten by retained records", async ({ page }) => {
  await page.addInitScript(({ settingsKey: key, historyKey: history, entry }) => {
    localStorage.setItem(key, JSON.stringify({ privacyByDefault: true, keepHistory: false, cloudSave: true, productAnalytics: true }));
    localStorage.setItem(history, JSON.stringify([entry]));
  }, { settingsKey, historyKey, entry: historyEntry });
  await page.goto("/");
  await page.locator("#openSettings").click();
  await expect(page.locator("#defaultPrivacy")).toBeChecked();
  await expect(page.locator("#saveHistory")).not.toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), settingsKey)).toEqual({
    privacyByDefault: true,
    keepHistory: false,
    cloudSave: true,
    productAnalytics: true,
  });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(1);
});

test("the opposite explicit privacy and history preferences remain unchanged", async ({ page }) => {
  const savedSettings = {
    privacyByDefault: false,
    keepHistory: true,
    cloudSave: false,
    productAnalytics: false,
  };
  await page.addInitScript(({ key, settings }) => {
    localStorage.setItem(key, JSON.stringify(settings));
  }, { key: settingsKey, settings: savedSettings });

  await page.goto("/");
  await page.locator("#openSettings").click();
  await expect(page.locator("#defaultPrivacy")).not.toBeChecked();
  await expect(page.locator("#saveHistory")).toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), settingsKey)).toEqual(savedSettings);
});

test.describe("local history opt-out", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ settingsKey: key, historyKey: history, entry }) => {
      localStorage.setItem(key, JSON.stringify({ privacyByDefault: true, keepHistory: true, cloudSave: false, productAnalytics: false }));
      localStorage.setItem(history, JSON.stringify([entry]));
    }, { settingsKey, historyKey, entry: historyEntry });
  });

  test("cancel keeps history enabled", async ({ page }) => {
    await page.goto("/");
    await page.locator("#openSettings").click();
    await page.locator("#saveHistory").uncheck();
    await expect(page.locator("#historyOptOutDialog")).toBeVisible();
    await page.locator("#cancelHistoryOptOut").click();
    await expect(page.locator("#saveHistory")).toBeChecked();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).keepHistory, settingsKey)).toBe(true);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(1);
  });

  test("turn off and keep preserves records and prevents new saves", async ({ page }) => {
    await page.goto("/");
    await page.locator("#openSettings").click();
    await page.locator("#saveHistory").uncheck();
    await page.locator("#keepHistoryRecords").click();
    await expect(page.locator("#saveHistory")).not.toBeChecked();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(1);
    await page.locator("#closeSettings").click();
    await fillAndGenerate(page);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(1);
  });

  test("turn off and delete clears records", async ({ page }) => {
    await page.goto("/");
    await page.locator("#openSettings").click();
    await page.locator("#saveHistory").uncheck();
    await page.locator("#deleteHistoryRecords").click();
    await expect(page.locator("#saveHistory")).not.toBeChecked();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(0);
  });
});

test("insecure HTTP mode disables all remote behavior while local generation succeeds", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ privacyByDefault: true, keepHistory: false, cloudSave: true, productAnalytics: true }));
  }, settingsKey);
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/");
  expect(await page.evaluate(() => globalThis.isSecureContext)).toBe(false);
  await expect(page.locator("#localModeNotice")).toBeVisible();
  await expect(page.locator("#cloudSave")).toBeDisabled();
  await expect(page.locator("#cloudSave")).not.toBeChecked();
  await expect(page.locator("#productAnalytics")).toBeDisabled();
  await expect(page.locator("#productAnalytics")).not.toBeChecked();
  await expect(page.locator("#deleteCloudData")).toBeDisabled();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), settingsKey)).toEqual({
    privacyByDefault: true,
    keepHistory: false,
    cloudSave: true,
    productAnalytics: true,
  });

  await fillAndGenerate(page);
  await expect(page.locator("#summaryAuthority")).not.toHaveText("");
  await expect(page.locator("#summaryProfile")).not.toHaveText("");
  await expect(page.locator("#chartPreview")).toHaveAttribute("alt", /Pluto/);
  await expect(page.locator("#resultSummary")).toBeFocused();
  await expect(page.locator("#resultSummary")).not.toContainText("Browser Fixture");
  await expect(page.locator("#resultSummary")).not.toContainText("Xiangtan");
  await expect(page.locator("#chartPreview")).not.toHaveAttribute("alt", /Browser Fixture|Xiangtan|1990/);
  expect(requests.some((url) => /supabase\.co|api-human-design\.wonderelian\.com/.test(url))).toBe(false);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("localhost secure context restores saved remote preferences", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({
      privacyByDefault: true,
      keepHistory: false,
      cloudSave: true,
      productAnalytics: true,
    }));
  }, settingsKey);

  await page.goto("http://127.0.0.1:8789/");
  expect(await page.evaluate(() => globalThis.isSecureContext)).toBe(true);
  await expect(page.locator("#localModeNotice")).toBeHidden();
  await expect(page.locator("#cloudSave")).toBeEnabled();
  await expect(page.locator("#productAnalytics")).toBeEnabled();
  await expect(page.locator("#deleteCloudData")).toBeEnabled();
  await expect(page.locator("#cloudSave")).toBeChecked();
  await expect(page.locator("#productAnalytics")).toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), settingsKey)).toMatchObject({
    privacyByDefault: true,
    keepHistory: false,
    cloudSave: true,
    productAnalytics: true,
  });
  expect(pageErrors).toEqual([]);
});

test("Capacitor native runtime enables remote controls on an insecure origin", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript((key) => {
    globalThis.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      registerPlugin: () => null,
    };
    localStorage.setItem(key, JSON.stringify({
      privacyByDefault: true,
      keepHistory: false,
      cloudSave: true,
      productAnalytics: true,
    }));
  }, settingsKey);

  await page.goto("/");
  expect(await page.evaluate(() => globalThis.isSecureContext)).toBe(false);
  await expect(page.locator("#localModeNotice")).toBeHidden();
  await expect(page.locator("#cloudSave")).toBeEnabled();
  await expect(page.locator("#productAnalytics")).toBeEnabled();
  await expect(page.locator("#deleteCloudData")).toBeEnabled();
  await expect(page.locator("#cloudSave")).toBeChecked();
  await expect(page.locator("#productAnalytics")).toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), settingsKey)).toMatchObject({
    cloudSave: true,
    productAnalytics: true,
  });
  expect(pageErrors).toEqual([]);
});

test("opening a generated history record restores the semantic result", async ({ page }) => {
  await page.goto("/");
  await page.locator("#openSettings").click();
  await page.locator("#saveHistory").check();
  await page.locator("#closeSettings").click();
  await fillAndGenerate(page);
  await page.locator("#editChart").click();
  await page.locator("#openHistory").click();
  await page.locator("[data-history-open]").first().click();
  await expect(page.locator("#chartResult")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#summaryType")).not.toHaveText("");
  await expect(page.locator("#summaryAuthority")).not.toHaveText("");
  await expect(page.locator("#resultSummary")).toBeFocused();
});

test("language switch updates local notice, disclaimer, summary, and history dialog", async ({ page }) => {
  await page.addInitScript(({ settingsKey: key, historyKey: history, entry }) => {
    localStorage.setItem(key, JSON.stringify({ privacyByDefault: true, keepHistory: true, cloudSave: false, productAnalytics: false }));
    localStorage.setItem(history, JSON.stringify([entry]));
  }, { settingsKey, historyKey, entry: historyEntry });
  await page.goto("/");
  await page.locator('[data-language="zh"]').click();
  await page.locator("#openSettings").click();
  await expect(page.locator('[data-i18n="defaultPrivacyHint"]')).toHaveText("生成图片时隐藏姓名、日期、时间和地点；默认关闭。");
  await expect(page.locator('[data-i18n="saveHistoryHint"]')).toHaveText("默认开启，仅保存在本设备；关闭时可选择保留或删除已有记录。");
  await page.locator("#closeSettings").click();
  await page.locator('[data-language="en"]').click();
  await expect(page.locator("#localModeNotice")).toContainText("temporary HTTP connection");
  await expect(page.locator(".form-disclaimer")).toContainText("For personal reflection");
  await page.locator("#openSettings").click();
  await expect(page.locator('[data-i18n="defaultPrivacyHint"]')).toHaveText("Hide name, date, time, and location in generated images. Off by default.");
  await expect(page.locator('[data-i18n="saveHistoryHint"]')).toHaveText("On by default and stored only on this device. When turning it off, choose whether to keep or delete existing records.");
  await page.locator("#saveHistory").uncheck();
  await expect(page.locator("#historyOptOutTitle")).toHaveText("Turn off local history?");
  await expect(page.locator("#keepHistoryRecords")).toHaveText("Turn Off & Keep Records");
  await page.locator("#cancelHistoryOptOut").click();
  await page.locator("#closeSettings").click();
  await fillAndGenerate(page);
  await expect(page.locator("#resultSummaryTitle")).toHaveText("Life Manual Result Summary");
  await expect(page.locator("#chartPreview")).toHaveAttribute("alt", /^Pluto Life Manual:/);
});

test("signature summary uses the real engine Sign value across languages and history", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-language="en"]').click();
  await page.locator("#openSettings").click();
  await page.locator("#defaultPrivacy").check();
  await page.locator("#saveHistory").check();
  await page.locator("#closeSettings").click();

  await fillProductionFixtureAndGenerate(page);

  for (const selector of [
    "#summaryType",
    "#summaryStrategy",
    "#summaryAuthority",
    "#summaryProfile",
    "#summaryDefinition",
    "#summaryCross",
    "#summarySignature",
    "#summaryNotSelf",
  ]) {
    await expect(page.locator(selector)).not.toHaveText("");
  }
  await expect(page.locator("#summarySignature")).toHaveText("Satisfaction");
  await expect(page.locator("#summaryNotSelf")).toHaveText("Frustration");
  await expect(page.locator("#resultSummary")).toBeFocused();
  await expect(page.locator("#resultSummary h2")).toHaveCount(1);
  await expect(page.locator("#resultSummary dl")).toHaveCount(1);
  await expect(page.locator("#resultSummary dt")).toHaveCount(8);
  await expect(page.locator("#resultSummary dd")).toHaveCount(8);
  await expect(page.locator("#chartPreview")).toHaveAttribute("aria-describedby", "resultSummary");
  await expect(page.locator("#resultSummary")).not.toContainText(/Production Smoke Test|1990-01-01|12:00|Wuhan/);
  await expect(page.locator("#chartPreview")).not.toHaveAttribute("alt", /Production Smoke Test|1990|12:00|Wuhan/);

  await page.locator('[data-language="zh"]').click();
  await expect(page.locator("#summarySignature")).toHaveText("满足感");
  await expect(page.locator("#summaryNotSelf")).toHaveText("挫败");

  await page.locator("#editChart").click();
  await page.locator("#openHistory").click();
  await page.locator("[data-history-open]").first().click();
  await expect(page.locator("#chartResult")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#summarySignature")).toHaveText("满足感");
  await expect(page.locator("#summaryNotSelf")).toHaveText("挫败");
  await expect(page.locator("#resultSummary")).toBeFocused();

  await page.locator('[data-language="en"]').click();
  await expect(page.locator("#summarySignature")).toHaveText("Satisfaction");
  await expect(page.locator("#summaryNotSelf")).toHaveText("Frustration");
});
