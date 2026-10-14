import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
test("real ZIP import, incorrect rewrite, correction, persisted XP and source graph", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "From “it works” to “I understand it.”",
    }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/overview.png", fullPage: true });
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const fixture = zipSync({
    "real-react/package.json": strToU8('{"dependencies":{"react":"^19.0.0"}}'),
    "real-react/src/math.ts": strToU8(
      "export function double(value: number): number { return value * 2; }",
    ),
    "real-react/src/App.tsx": strToU8(
      'import { double } from "./math"; export function App() { return <h1>{double(3)}</h1>; }',
    ),
  });
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "real-react.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(fixture),
  });
  await expect(
    page.getByRole("heading", { name: "real-react", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Understand double/ }).click();
  await expect(
    page.getByRole("heading", { name: "Get to know double" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide & rewrite" }).click();
  const editor = page.locator(".monaco-editor textarea").first();
  await editor.waitFor();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    "function double(value: number): number { return 0; }",
  );
  await expect(page.locator(".coding-pet")).toHaveAttribute(
    "data-state",
    "watching",
  );
  await page.getByRole("button", { name: "Run checks" }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator(".coding-pet")).toHaveAttribute(
    "data-state",
    "frustrated",
  );
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    "function double(value: number): number { return value + value; }",
  );
  await page.getByRole("button", { name: "Run checks" }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: "artifacts/practice.png", fullPage: true });
  await page.reload();
  await page
    .getByRole("button", { name: "Learning path", exact: true })
    .click();
  await expect(page.getByText("PROBES PASSED", { exact: true })).toBeVisible();
  await expect(
    page.locator(".campaign-summary").getByText("100 XP", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page
    .getByRole("button", { name: "Fieldwork Paper", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export progress", exact: true })
    .click();
  const download = await downloading,
    stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const progressBytes = Buffer.concat(chunks),
    progress = JSON.parse(progressBytes.toString());
  expect(progress.format).toBe("reporecode-progress");
  expect(progress.completed).toHaveLength(1);
  expect(progress.files).toBeUndefined();
  expect(progress.drafts).toBeUndefined();
  const context = await page.context().browser()!.newContext();
  try {
    const destination = await context.newPage();
    await destination.goto(page.url());
    await destination
      .getByRole("button", { name: "Import a project", exact: true })
      .click();
    await destination
      .locator('input[type=file][accept=".zip"]')
      .setInputFiles({
        name: "real-react.zip",
        mimeType: "application/zip",
        buffer: Buffer.from(fixture),
      });
    await expect(
      destination.getByRole("heading", { name: "real-react", exact: true }),
    ).toBeVisible();
    await destination
      .getByRole("button", { name: "Preferences", exact: true })
      .click();
    for (let i = 0; i < 2; i++) {
      await destination
        .getByLabel("Learning progress file")
        .setInputFiles({
          name: "progress.json",
          mimeType: "application/json",
          buffer: progressBytes,
        });
      await expect(destination.getByText(/Progress merged/)).toBeVisible();
    }
    await destination
      .getByRole("button", { name: "Learning path", exact: true })
      .click();
    await expect(
      destination
        .locator(".campaign-summary")
        .getByText("100 XP", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
  expect(errors).toEqual([]);
});
test("small-screen import and source study stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trail journal", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
