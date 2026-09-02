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

async function openDrawerItem(page, selector) {
  await page.locator("#openMenu").click();
  await expect(page.locator("#appDrawer")).toBeVisible();
  await page.locator(selector).click();
}

async function switchLanguage(page, language) {
  await page.locator(`.topbar [data-language="${language}"]`).click();
}

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

async function installNativeRuntime(page, settings) {
  await page.addInitScript(({ key, savedSettings }) => {
    globalThis.__plutoNativeCalls = [];
    globalThis.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      registerPlugin: () => ({
        saveImage: async ({ fileName }) => {
          globalThis.__plutoNativeCalls.push({ method: "saveImage", fileName });
          return { completed: true };
        },
        shareImage: async ({ fileName }) => {
          globalThis.__plutoNativeCalls.push({ method: "shareImage", fileName });
          return { completed: true };
        },
      }),
    };
    localStorage.setItem(key, JSON.stringify(savedSettings));
    localStorage.setItem("pluto-language", "zh");
  }, { key: settingsKey, savedSettings: settings });
}

async function provideSupabaseRuntimeConfig(page) {
  await page.route("**/runtime-config.js*", (route) => {
    if (new URL(route.request().url()).pathname !== "/runtime-config.js") return route.continue();
    return route.fulfill({
      contentType: "application/javascript",
      body: `globalThis.PLUTO_CONFIG = Object.freeze({
        supabaseUrl: "https://configured.supabase.co",
        supabasePublishableKey: "test-publishable-key",
        apiBaseUrl: "",
        appVersion: "1.1.0",
        gitCommit: "test",
        buildDate: "test",
        environment: "test"
      });`,
    });
  });
}

async function selectBirth(page, { includeDate = true, includeTime = true } = {}) {
  if (includeDate) {
    await page.locator("#birthDate").fill("1990-01-01");
  }
  if (includeTime) {
    await page.locator("#birthTime").fill("12:00");
  }
}

async function fillAndGenerate(page) {
  await page.locator("#name").fill("Browser Fixture");
  await page.locator("#nextToBirth").click();
  await selectBirth(page);
  await page.locator("#nextToLocation").click();
  await page.locator("#location").fill("Xiangtan");
  await expect(page.locator("#locationResults")).toBeVisible();
  await page.locator("#locationResults [role=option]").first().click();
  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator("#chartResult")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#summaryType")).not.toHaveText("");
}

async function fillProductionFixtureAndGenerate(page) {
  await page.locator("#name").fill("Production Smoke Test");
  await page.locator("#nextToBirth").click();
  await selectBirth(page);
  await page.locator("#nextToLocation").click();
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
  for (const selector of ["#birthDate", "#birthTime"]) {
    await expect(page.locator(selector)).toHaveValue("");
  }
  await expect(page.locator("#defaultPrivacy")).not.toBeChecked();
  await expect(page.locator("#privacyMode")).not.toBeChecked();
  await expect(page.locator("#saveHistory")).toBeChecked();
  await expect(page.locator("#cloudSave")).not.toBeChecked();
  await expect(page.locator("#productAnalytics")).not.toBeChecked();

  await page.locator("#nextToBirth").click();
  await expect(page.locator("#name")).toBeFocused();
  await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#name").fill("Validation Fixture");
  await page.locator("#nextToBirth").click();
  await expect(page.locator('[data-form-step="2"]')).toBeVisible();
  await page.locator("#backToName").click();
  await expect(page.locator("#name")).toHaveValue("Validation Fixture");
  await page.locator("#nextToBirth").click();
  await page.locator("#nextToLocation").click();
  await expect(page.locator("#birthDate")).toBeFocused();
  await expect(page.locator("#birthDate")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#birthDate").fill("1990-01-01");
  await expect(page.locator("#birthDate")).not.toHaveAttribute("aria-invalid", "true");
  await page.locator("#nextToLocation").click();
  await expect(page.locator("#birthTime")).toBeFocused();
  await expect(page.locator("#birthTime")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#birthTime").fill("12:00");
  await expect(page.locator("#birthTime")).not.toHaveAttribute("aria-invalid", "true");

  await page.locator("#nextToLocation").click();
  await expect(page.locator('[data-form-step="3"]')).toBeVisible();
  await page.locator("#chartForm button[type=submit]").click();
  await expect(page.locator("#location")).toBeFocused();
  await expect(page.locator("#location")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#location").fill("Xiangtan");
  await expect(page.locator("#location")).not.toHaveAttribute("aria-invalid", "true");
});

test("native birth controls stay inside the mobile form", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#name").fill("Mobile Layout Check");
  await page.locator("#nextToBirth").click();

  const formBox = await page.locator(".form-panel").boundingBox();
  const fieldBoxes = await Promise.all([
    page.locator("#birthDate").boundingBox(),
    page.locator("#birthTime").boundingBox(),
  ]);

  expect(formBox).not.toBeNull();
  for (const box of fieldBoxes) {
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(formBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(formBox.x + formBox.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("language switching translates the current step without resetting the form", async ({ page }) => {
  await page.goto("/");
  await switchLanguage(page, "zh");
  await page.locator("#name").fill("Language Fixture");
  await page.locator("#nextToBirth").click();
  await selectBirth(page);
  await page.locator("#nextToLocation").click();
  await expect(page.locator("#formStepStatus")).toHaveText("第 3 步，共 3 步：出生地点");

  await switchLanguage(page, "en");

  await expect(page.locator("#formStepStatus")).toHaveText("Step 3 of 3: Birth place");
  await expect(page.locator('[data-form-step="3"]')).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("Language Fixture");
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

test("mobile birth controls fit cleanly while the settings drawer scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto("/");
  await page.locator("#name").fill("Mobile Flow");
  await page.locator("#nextToBirth").click();
  const next = page.locator("#nextToLocation");
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await openDrawerItem(page, "#openSettings");
  await expect(page.locator("#settingsDialog")).toBeVisible();
  const drawerScroll = page.locator(".drawer-scroll");
  expect(await drawerScroll.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await drawerScroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await drawerScroll.evaluate((element) => element.scrollTop > 0)).toBe(true);
});

test("mobile header keeps language beside the drawer and closes predictably", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto("/");

  await expect(page.locator("#openMenu")).toBeVisible();
  await expect(page.locator(".topbar-language-switch")).toBeVisible();
  await expect(page.locator('.topbar [data-language="zh"]')).toBeVisible();
  await expect(page.locator('.topbar [data-language="en"]')).toBeVisible();
  await expect(page.locator("#appDrawer")).toBeHidden();
  await page.locator("#openMenu").click();
  await expect(page.locator("#appDrawer")).toBeVisible();
  await expect(page.locator("#openMenu")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#openHistory")).toBeVisible();
  await expect(page.locator("#openSettings")).toBeVisible();
  await expect(page.locator('.drawer-nav [data-language]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.locator("#openHistory").click();
  await expect(page.locator("#historyDialog")).toBeVisible();
  await expect(page.locator("#appDrawer")).toBeVisible();
  await expect(page.locator("#drawerBack")).toBeVisible();
  await page.locator("#drawerBack").click();
  await expect(page.locator("#appDrawer")).toBeVisible();
  await page.locator("#openSettings").click();
  await expect(page.locator("#settingsDialog")).toBeVisible();
  await expect(page.locator("#appDrawer")).toBeVisible();
  await page.locator("#drawerBack").click();
  await expect(page.locator("#appDrawer")).toBeVisible();
  await expect(page.locator("#openSettings")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.locator("#appDrawer")).toBeHidden();
  await expect(page.locator("#openMenu")).toBeFocused();
  await expect(page.locator("#openMenu")).toHaveAttribute("aria-expanded", "false");

  await switchLanguage(page, "en");
  await expect(page.locator("#appDrawer")).toBeHidden();
  await page.locator("#openMenu").click();
  await expect(page.locator("#drawerTitle")).toHaveText("Your space");
  await page.locator(".drawer-backdrop").click({ position: { x: 4, y: 4 } });
  await expect(page.locator("#appDrawer")).toBeHidden();
});
test("web drawer exposes about, contact, and WonderElian-first works", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await switchLanguage(page, "zh");
  await page.locator("#openMenu").click();

  await expect(page.locator("#openAbout")).toBeVisible();
  await expect(page.locator("#openContact")).toBeVisible();
  await expect(page.locator(".drawer-nav-icon img")).toHaveCount(4);
  await expect(page.locator("#openContact .drawer-nav-icon img")).toHaveAttribute(
    "src",
    /^assets\/icons\/mail\.svg(?:\?v=[0-9a-f]+)?$/,
  );
  await expect(page.locator(".drawer-work-card")).toHaveCount(5);
  await expect(page.locator(".drawer-work-card").first()).toHaveAttribute("href", "https://wonderelian.com/");
  await expect(page.locator(".drawer-work-card").first()).toContainText("WonderElian 是永歌 Elian 的个人创作空间");
  await expect(page.locator("#drawerSupport")).toHaveCount(0);
  await expect(page.locator("#supportDialog")).toHaveCount(0);

  await page.locator("#openAbout").click();
  await expect(page.locator("#drawerTitle")).toHaveText("关于我们");
  await expect(page.locator("#drawerAbout")).toBeVisible();
  await expect(page.locator(".drawer-life-philosophy")).toContainText("向内认识自己，向外如水而行。");
  await expect(page.locator(".drawer-life-path strong")).toHaveCount(4);
  await expect(page.locator(".drawer-life-principles article")).toHaveCount(4);
  await page.locator("#drawerBack").click();
  await page.locator("#openContact").click();
  await expect(page.locator("#drawerTitle")).toHaveText("联系我们");
  await expect(page.locator("#drawerContact")).toBeVisible();
  await page.locator("#drawerBack").click();

  await page.locator("#closeMenu").click();
  await switchLanguage(page, "en");
  await page.locator("#openMenu").click();
  await expect(page.locator(".drawer-work-card").first()).toContainText("Make complex ideas clear, beautiful, and human");
});

test("native drawer excludes support while keeping the other information", async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      registerPlugin: () => ({}),
    };
  });
  await page.goto("/");
  await page.locator("#openMenu").click();

  await expect(page.locator("#openAbout")).toBeVisible();
  await expect(page.locator("#openContact")).toBeVisible();
  await expect(page.locator(".drawer-work-card")).toHaveCount(5);
  await expect(page.locator(".drawer-work-card").first()).toHaveAttribute("href", "https://wonderelian.com/");
  await expect(page.locator("#drawerSupport")).toHaveCount(0);
  await expect(page.locator("#supportDialog")).toHaveCount(0);
});
test("an explicit disabled history setting is not overwritten by retained records", async ({ page }) => {
  await page.addInitScript(({ settingsKey: key, historyKey: history, entry }) => {
    localStorage.setItem(key, JSON.stringify({ privacyByDefault: true, keepHistory: false, cloudSave: true, productAnalytics: true }));
    localStorage.setItem(history, JSON.stringify([entry]));
  }, { settingsKey, historyKey, entry: historyEntry });
  await page.goto("/");
  await openDrawerItem(page, "#openSettings");
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
  await openDrawerItem(page, "#openSettings");
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
    await openDrawerItem(page, "#openSettings");
    await page.locator("#saveHistory").uncheck();
    await expect(page.locator("#historyOptOutDialog")).toBeVisible();
    await page.locator("#cancelHistoryOptOut").click();
    await expect(page.locator("#saveHistory")).toBeChecked();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).keepHistory, settingsKey)).toBe(true);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(1);
  });

  test("turn off and keep preserves records and prevents new saves", async ({ page }) => {
    await page.goto("/");
    await openDrawerItem(page, "#openSettings");
    await page.locator("#saveHistory").uncheck();
    await page.locator("#keepHistoryRecords").click();
    await expect(page.locator("#saveHistory")).not.toBeChecked();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(1);
    await page.locator("#closeMenu").click();
    await fillAndGenerate(page);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, historyKey)).toBe(1);
  });

  test("turn off and delete clears records", async ({ page }) => {
    await page.goto("/");
    await openDrawerItem(page, "#openSettings");
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

test("localhost secure context restores saved remote preferences", async ({ page }, testInfo) => {
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

  const localhostUrl = new URL(testInfo.project.use.baseURL);
  localhostUrl.hostname = "127.0.0.1";
  await page.goto(localhostUrl.href);
  expect(await page.evaluate(() => globalThis.isSecureContext)).toBe(true);
  await expect(page.locator("#localModeNotice")).toBeHidden();
  await openDrawerItem(page, "#openSettings");
  await expect(page.locator("#cloudSaveSetting")).toBeVisible();
  await expect(page.locator("#productAnalyticsSetting")).toBeVisible();
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

test("Capacitor native runtime without Supabase hides and blocks remote features", async ({ page }) => {
  const requests = [];
  const pageErrors = [];
  const consoleErrors = [];
  const failedLocalRequests = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).hostname === "pluto.test") failedLocalRequests.push(request.url());
  });
  await installNativeRuntime(page, {
    privacyByDefault: true,
    keepHistory: true,
    cloudSave: true,
    productAnalytics: true,
  });

  await page.goto("/");
  expect(await page.evaluate(() => globalThis.isSecureContext)).toBe(false);
  await expect(page.locator("#localModeNotice")).toBeHidden();
  await openDrawerItem(page, "#openSettings");
  await expect(page.locator("#cloudSaveSetting")).toBeHidden();
  await expect(page.locator("#productAnalyticsSetting")).toBeHidden();
  await expect(page.locator("#deleteCloudData")).toBeHidden();
  await expect(page.locator("#cloudSave")).toBeDisabled();
  await expect(page.locator("#productAnalytics")).toBeDisabled();
  await expect(page.locator("#deleteCloudData")).toBeDisabled();
  await expect(page.locator("#cloudSave")).not.toBeChecked();
  await expect(page.locator("#productAnalytics")).not.toBeChecked();
  await expect(page.locator("#defaultPrivacy")).toBeEnabled();
  await expect(page.locator("#saveHistory")).toBeEnabled();
  await expect(page.locator(".settings-note")).toHaveText("隐私模式和本地历史记录仅保存在此设备。当前版本不提供云端保存或匿名统计。");

  const storedSettings = {
    privacyByDefault: true,
    keepHistory: true,
    cloudSave: true,
    productAnalytics: true,
  };
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), settingsKey)).toEqual(storedSettings);

  await page.evaluate(() => {
    const cloudSave = document.querySelector("#cloudSave");
    const analytics = document.querySelector("#productAnalytics");
    cloudSave.checked = true;
    analytics.checked = true;
    cloudSave.dispatchEvent(new Event("change", { bubbles: true }));
    analytics.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector("#deleteCloudData").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), settingsKey)).toEqual(storedSettings);

  await page.locator("#closeMenu").click();
  await fillProductionFixtureAndGenerate(page);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "[]").length, historyKey)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("pluto-anonymous-cloud-session-v1"))).toBeNull();

  await page.locator("#download").click();
  await expect.poll(() => page.evaluate(() => globalThis.__plutoNativeCalls.map((call) => call.method))).toContain("saveImage");
  await page.locator("#share").click();
  await expect.poll(() => page.evaluate(() => globalThis.__plutoNativeCalls.map((call) => call.method))).toContain("shareImage");

  await page.locator("#editChart").click();
  await switchLanguage(page, "en");
  await openDrawerItem(page, "#openSettings");
  await expect(page.locator(".settings-note")).toHaveText("Privacy mode and local history stay on this device. Cloud saving and anonymous analytics are not available in this release.");
  expect(requests.some((url) => /supabase\.co|api-human-design\.wonderelian\.com/.test(url))).toBe(false);
  expect(failedLocalRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("Capacitor native runtime with complete Supabase config can expose remote features", async ({ page }) => {
  await provideSupabaseRuntimeConfig(page);
  await installNativeRuntime(page, {
    privacyByDefault: false,
    keepHistory: true,
    cloudSave: false,
    productAnalytics: false,
  });

  await page.goto("/");
  expect(await page.evaluate(() => globalThis.PLUTO_CONFIG)).toMatchObject({
    supabaseUrl: "https://configured.supabase.co",
    supabasePublishableKey: "test-publishable-key",
  });
  expect(await page.evaluate(async () => {
    const moduleUrl = performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .find((url) => url.includes("/src/config/runtime-config.js"));
    const module = await import(moduleUrl);
    return {
      configured: module.hasSupabaseConfig(),
      runtimeConfig: module.runtimeConfig,
    };
  })).toMatchObject({
    configured: true,
    runtimeConfig: {
      supabaseUrl: "https://configured.supabase.co",
      supabasePublishableKey: "test-publishable-key",
    },
  });
  await openDrawerItem(page, "#openSettings");
  await expect(page.locator("#cloudSaveSetting")).toBeVisible();
  await expect(page.locator("#productAnalyticsSetting")).toBeVisible();
  await expect(page.locator("#deleteCloudData")).toBeVisible();
  await expect(page.locator("#cloudSave")).toBeEnabled();
  await expect(page.locator("#productAnalytics")).toBeEnabled();
  await expect(page.locator("#deleteCloudData")).toBeEnabled();
  await expect(page.locator("#cloudSave")).not.toBeChecked();
  await expect(page.locator("#productAnalytics")).not.toBeChecked();
});

test("opening a generated history record restores the semantic result", async ({ page }) => {
  await page.goto("/");
  await openDrawerItem(page, "#openSettings");
  await page.locator("#saveHistory").check();
  await page.locator("#closeMenu").click();
  await fillAndGenerate(page);
  await page.locator("#editChart").click();
  await page.evaluate(() => {
    const originalHtml2Canvas = globalThis.html2canvas;
    globalThis.html2canvas = async (...args) => {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      return originalHtml2Canvas(...args);
    };
  });
  await openDrawerItem(page, "#openHistory");
  await page.locator("[data-history-open]").first().click();
  await expect(page.locator("#chartResult")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".preview-stage")).toHaveAttribute("data-media-state", "loading");
  await expect(page.locator(".preview-stage .media-loading-placeholder")).toBeVisible();
  await expect(page.locator(".preview-stage .media-loading-placeholder > span")).toHaveCSS("animation-name", "pluto-placeholder-shimmer");
  await expect(page.locator(".preview-stage")).toHaveAttribute("data-media-state", "ready", { timeout: 45_000 });
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
  await switchLanguage(page, "zh");
  await openDrawerItem(page, "#openSettings");
  await expect(page.locator('[data-i18n="defaultPrivacyHint"]')).toHaveText("生成图片时隐藏姓名、日期、时间和地点；默认关闭。");
  await expect(page.locator('[data-i18n="saveHistoryHint"]')).toHaveText("默认开启，仅保存在本设备；关闭时可选择保留或删除已有记录。");
  await page.locator("#closeMenu").click();
  await switchLanguage(page, "en");
  await expect(page.locator("#localModeNotice")).toContainText("temporary HTTP connection");
  await expect(page.locator(".form-disclaimer")).toContainText("For personal reflection");
  await openDrawerItem(page, "#openSettings");
  await expect(page.locator('[data-i18n="defaultPrivacyHint"]')).toHaveText("Hide name, date, time, and location in generated images. Off by default.");
  await expect(page.locator('[data-i18n="saveHistoryHint"]')).toHaveText("On by default and stored only on this device. When turning it off, choose whether to keep or delete existing records.");
  await page.locator("#saveHistory").uncheck();
  await expect(page.locator("#historyOptOutTitle")).toHaveText("Turn off local history?");
  await expect(page.locator("#keepHistoryRecords")).toHaveText("Turn Off & Keep Records");
  await page.locator("#cancelHistoryOptOut").click();
  await page.locator("#closeMenu").click();
  await fillAndGenerate(page);
  await expect(page.locator("#resultSummaryTitle")).toHaveText("Life Manual Result Summary");
  await expect(page.locator("#chartPreview")).toHaveAttribute("alt", /^Pluto Life Manual:/);
});

test("fingerprinted production bundle loads every calculation asset without module errors or 404s", async ({ page }) => {
  const failedLocalRequests = [];
  const badLocalResponses = [];
  const pageErrors = [];
  const loaded = new Map();
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).hostname === "pluto.test") failedLocalRequests.push(request.url());
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname !== "pluto.test") return;
    loaded.set(url.pathname, url);
    if (response.status() >= 400) badLocalResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await fillProductionFixtureAndGenerate(page);
  await expect(page.locator("#chartPreview")).toBeVisible();

  expect(failedLocalRequests).toEqual([]);
  expect(badLocalResponses).toEqual([]);
  expect(pageErrors).toEqual([]);
  for (const path of [
    "/style.css",
    "/app.js",
    "/runtime-config.js",
    "/build-provenance.js",
    "/assets/bodygraph-original-template.svg",
    "/vendor/swisseph/swisseph.wasm",
    "/vendor/swisseph/ephe/sepl_18.se1",
    "/vendor/swisseph/ephe/semo_18.se1",
    "/vendor/swisseph/ephe/seas_18.se1",
  ]) {
    expect(loaded.has(path), `${path} should load`).toBe(true);
    expect(loaded.get(path).searchParams.get("v"), `${path} should be fingerprinted`).toMatch(/^[a-f0-9]{16}$/);
  }
  expect(new Set([...loaded.values()].map((url) => url.searchParams.get("v")).filter(Boolean)).size).toBe(1);
});

test("signature summary uses the real engine Sign value across languages and history", async ({ page }) => {
  await page.goto("/");
  await switchLanguage(page, "en");
  await openDrawerItem(page, "#openSettings");
  await page.locator("#defaultPrivacy").check();
  await page.locator("#saveHistory").check();
  await page.locator("#closeMenu").click();

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

  await switchLanguage(page, "zh");
  await expect(page.locator("#summarySignature")).toHaveText("满足感");
  await expect(page.locator("#summaryNotSelf")).toHaveText("挫败");

  await page.locator("#editChart").click();
  await openDrawerItem(page, "#openHistory");
  await page.locator("[data-history-open]").first().click();
  await expect(page.locator("#chartResult")).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#summarySignature")).toHaveText("满足感");
  await expect(page.locator("#summaryNotSelf")).toHaveText("挫败");
  await expect(page.locator("#resultSummary")).toBeFocused();

  await switchLanguage(page, "en");
  await expect(page.locator("#summarySignature")).toHaveText("Satisfaction");
  await expect(page.locator("#summaryNotSelf")).toHaveText("Frustration");
});
