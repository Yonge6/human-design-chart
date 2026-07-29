import { defineConfig } from "@playwright/test";

const e2ePort = Number(process.env.PLUTO_E2E_PORT || 8790);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "line",
  use: {
    baseURL: `http://pluto.test:${e2ePort}`,
    browserName: "chromium",
    launchOptions: {
      args: [
        "--host-resolver-rules=MAP pluto.test 127.0.0.1",
        "--proxy-server=direct://",
        "--proxy-bypass-list=*",
      ],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `PORT=${e2ePort} node scripts/serve-dist.mjs`,
    url: `http://127.0.0.1:${e2ePort}`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
