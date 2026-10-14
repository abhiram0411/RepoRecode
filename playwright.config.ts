import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:5180",
    headless: true,
    channel:
      process.env.PLAYWRIGHT_CHANNEL ||
      (process.platform === "win32" ? "msedge" : "chromium"),
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  workers: 1,
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: "npm run preview -- --port 5180 --strictPort",
        url: "http://127.0.0.1:5180",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/browser-results.json" }],
  ],
});
