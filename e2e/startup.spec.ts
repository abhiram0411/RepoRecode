import { test, expect } from "@playwright/test";

test("startup stays readable when the app script fails and reload recovers", async ({
  page,
  browser,
}) => {
  const script = "**/assets/index-*.js";
  await page.route(script, (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Opening RepoRecode" }),
  ).toBeVisible();
  await expect(
    page.getByText(/check\s+your\s+connection\s+and\s+reload/),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/startup-recovery.png" });
  await page.unroute(script);
  await page.getByRole("link", { name: "Reload the workspace" }).click();
  await expect(
    page.getByRole("button", { name: "Import a project", exact: true }),
  ).toBeVisible();
  const withoutScripts = await browser.newContext({ javaScriptEnabled: false });
  try {
    const plain = await withoutScripts.newPage();
    await plain.goto(page.url());
    await expect(
      plain.getByText(/JavaScript\s+is\s+required\s+to\s+open\s+the\s+workspace/),
    ).toBeVisible();
  } finally {
    await withoutScripts.close();
  }
});
