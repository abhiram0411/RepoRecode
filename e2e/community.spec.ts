import { test, expect } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createGateway } from "../server/index.mjs";

test("local feedback, protected review and opt-in/revocation work in the browser", async ({
  page,
  baseURL,
}) => {
  test.skip(
    process.env.LOCAL_COMMUNITY_E2E !== "true",
    "Requires a disposable local gateway; never submit test feedback to production.",
  );
  if (!baseURL?.startsWith("http://127.0.0.1:"))
    throw Error("Local fixture requires a loopback frontend.");
  const directory = await mkdtemp(
    join(tmpdir(), "reporecode-browser-community-"),
  );
  const token = randomUUID() + randomUUID();
  const server = createGateway({
    env: {
      NODE_ENV: "test",
      APP_ORIGIN: baseURL,
      LOCAL_ADMIN_TOKEN: token,
      COMMUNITY_STORAGE_PATH: join(directory, "community.json"),
    },
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(8788, "127.0.0.1", resolve);
  });
  const activity: string[] = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/api/activity")) activity.push(req.method());
  });
  try {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Preferences", exact: true })
      .click();
    const consent = page.getByLabel("Share anonymous activity");
    await expect(consent).toBeEnabled();
    await expect(consent).not.toBeChecked();
    expect(activity).toEqual([]);
    await page
      .getByLabel("Your feedback")
      .fill(
        "Please add shortcuts. <script>window.feedbackExecuted=true</script>",
      );
    await page.getByLabel("Rating (optional)").selectOption("4");
    await page
      .getByRole("button", { name: "Send feedback", exact: true })
      .click();
    await expect(
      page.getByText(
        "Feedback received. Thank you for helping improve RepoRecode.",
      ),
    ).toBeVisible();
    await consent.check();
    await expect(
      page.getByText("Anonymous activity enabled for this browser."),
    ).toBeVisible();
    await consent.uncheck();
    await expect(
      page.getByText(
        "Collection stopped and this browser’s activity record removed.",
      ),
    ).toBeVisible();
    expect(activity).toEqual(["POST", "DELETE"]);
    await page.reload();
    await page
      .getByRole("button", { name: "Preferences", exact: true })
      .click();
    await expect(consent).toBeEnabled();
    await expect(consent).not.toBeChecked();
    expect(activity).toEqual(["POST", "DELETE"]);
    await page.goto("/admin");
    await page
      .getByLabel("Local administrator token")
      .fill("incorrect-operator-token-at-least-32-chars");
    await page
      .getByRole("button", { name: "Load local community metrics" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Local operator access requires",
    );
    await page.getByLabel("Local administrator token").fill(token);
    await page
      .getByRole("button", { name: "Load local community metrics" })
      .click();
    await expect(page.locator(".feedback-entry")).toContainText(
      "<script>window.feedbackExecuted=true</script>",
    );
    await expect(page.getByLabel("Local administrator token")).toHaveValue("");
    const metric = (name: string) =>
      page
        .locator("dl > div")
        .filter({ has: page.locator("dt", { hasText: name }) })
        .locator("dd");
    await expect(metric("Feedback received")).toHaveText("1");
    await expect(metric("Retained opt-in installations")).toHaveText("0");
    expect(
      await page.evaluate(() => Reflect.get(window, "feedbackExecuted")),
    ).toBeUndefined();
    await page.screenshot({
      path: "artifacts/community-admin.png",
      fullPage: true,
    });
  } finally {
    await new Promise<void>((r) => server.close(r));
    await rm(directory, { recursive: true, force: true });
  }
});
