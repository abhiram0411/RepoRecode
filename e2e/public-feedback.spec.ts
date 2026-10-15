import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public feedback creates a reviewable GitHub draft without posting or attaching private fields", async ({
  page,
  context,
}) => {
  await page.route("**/api/community/status", (route) =>
    route.fulfill({
      status: 404,
      contentType: "text/html",
      body: "Not configured",
    }),
  );
  const writes: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "GET") writes.push(req.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(
    page.getByText(/submitted issues are public under your GitHub username/),
  ).toBeVisible();
  await expect(page.getByLabel("Contact email (optional)")).toHaveCount(0);
  await expect(page.getByLabel("Rating (optional)")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send feedback", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Share anonymous activity")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Copy feedback", exact: true }),
  ).toBeDisabled();
  const message =
    "Please explain nested values: 日本語 &body=changed #fragment <script>alert(1)</script>";
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("bug");
  await page.getByLabel("Your feedback").fill(message);
  const link = page.getByRole("link", { name: "Review draft on GitHub" });
  const href = await link.getAttribute("href");
  const url = new URL(href!);
  expect(url.origin).toBe("https://github.com");
  expect(url.pathname).toBe("/abhiram0411/RepoRecode/issues/new");
  expect([...url.searchParams.keys()]).toEqual(["title", "body"]);
  expect(url.searchParams.get("title")).toBe("Bug report");
  expect(url.searchParams.get("body")).toBe(`## Bug report\n\n${message}`);
  expect(url.hash).toBe("");
  expect(writes).toEqual([]);
  // Inspect a user-opened navigation without submitting or contacting GitHub.
  await context.route("https://github.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Draft destination</h1>",
    }),
  );
  const opened = page.waitForEvent("popup");
  await link.click();
  const popup = await opened;
  await expect(
    popup.getByRole("heading", { name: "Draft destination" }),
  ).toBeVisible();
  expect(popup.url()).toBe(href);
  await popup.close();
  await expect(page.getByLabel("Your feedback")).toHaveValue(message);
  const axe = await new AxeBuilder({ page })
    .include(".community-card")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".community-card")
    .screenshot({ path: "artifacts/public-feedback-mobile.png" });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("long feedback preserves its whole text when copying or when clipboard access fails", async ({
  page,
}) => {
  await page.route("**/api/community/status", (route) =>
    route.fulfill({
      json: { feedbackEnabled: false, telemetryEnabled: false },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  const message = "漢".repeat(1000);
  await page.getByLabel("Your feedback").fill(message);
  const link = page.getByRole("link", {
    name: "Open GitHub and paste feedback",
  });
  const url = new URL((await link.getAttribute("href"))!);
  expect(url.searchParams.has("body")).toBe(false);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          Reflect.set(window, "copiedFeedback", text);
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Copy feedback", exact: true })
    .click();
  await expect(page.getByText(/Feedback copied\. Paste it/)).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "copiedFeedback"))).toBe(
    `## Feature request\n\n${message}`,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("denied");
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Copy feedback", exact: true })
    .click();
  await expect(page.getByText(/Clipboard access is unavailable/)).toBeVisible();
  await expect(page.getByLabel("Your feedback")).toHaveValue(message);
  await page.getByLabel("Your feedback").fill("Short");
  await expect(
    page.getByRole("button", { name: "Copy feedback", exact: true }),
  ).toBeDisabled();
  await expect(link).toHaveCount(0);
  await expect(page.getByText(/Clipboard access is unavailable/)).toHaveCount(
    0,
  );
});

test("activity availability is independent of anonymous feedback availability", async ({
  page,
}) => {
  let feedback = true;
  await page.route("**/api/community/status", (route) =>
    route.fulfill({
      json: { feedbackEnabled: feedback, telemetryEnabled: !feedback },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Send feedback", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Share anonymous activity")).toBeDisabled();
  feedback = false;
  await page.reload();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copy feedback", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Share anonymous activity")).toBeEnabled();
  await expect(page.getByLabel("Share anonymous activity")).not.toBeChecked();
});
