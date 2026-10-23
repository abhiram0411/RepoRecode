import { defineConfig } from "@playwright/test";
const browserName = process.env.PLAYWRIGHT_BROWSER ?? "chromium";
if (!["chromium", "firefox", "webkit"].includes(browserName))
  throw Error("Unsupported PLAYWRIGHT_BROWSER");
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  use: {
    browserName: browserName as "chromium" | "firefox" | "webkit",
    baseURL: process.env.TEST_URL || "http://127.0.0.1:5180",
    headless: true,
    channel:
      browserName === "chromium"
        ? process.env.PLAYWRIGHT_CHANNEL ||
          (process.platform === "win32" ? "msedge" : "chromium")
        : undefined,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  workers: 1,
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: `npm run ${process.env.PLAYWRIGHT_DEV === "true" ? "dev" : "preview"} -- --port 5180 --strictPort`,
        url: "http://127.0.0.1:5180",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/browser-results.json" }],
  ],
});
