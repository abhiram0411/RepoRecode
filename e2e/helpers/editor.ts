import type { Page } from "@playwright/test";

export async function selectAllCode(page: Page) {
  // Monaco derives its shortcut platform from the UA, including WebKit's
  // Macintosh UA on Windows/Linux. The test runner's OS is not authoritative.
  const mac = await page.evaluate(() =>
    navigator.userAgent.includes("Macintosh"),
  );
  await page.keyboard.press(mac ? "Meta+A" : "Control+A");
}
