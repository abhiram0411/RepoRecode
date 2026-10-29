import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("changed reimports reuse unchanged source and keep both snapshots; identical imports resume", async ({
  page,
}) => {
  await page.goto("/");
  async function upload(multiplier: number) {
    await page
      .getByRole("button", { name: "Import project", exact: true })
      .first()
      .click();
    const files = zipSync({
      "revision/src/math.ts": strToU8(
        `export function double(x:number){return x*${multiplier};}`,
      ),
      "revision/src/App.tsx": strToU8(
        'import {double} from "./math"; export function App(){return <p>{double(2)}</p>;}',
      ),
      "revision/src/unrelated.ts": strToU8(
        "export function unrelated(x:boolean){return !x}",
      ),
    });
    await page.locator('input[type=file][accept=".zip"]').setInputFiles({
      name: "revision.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(files),
    });
    await expect(
      page.getByRole("heading", { name: "revision", exact: true, level: 1 }),
    ).toBeVisible();
  }
  await upload(2);
  await expect(
    page.getByText(/Read 3 new or changed files; reused 0 unchanged files/),
  ).toBeVisible();
  await upload(3);
  await expect(
    page.getByText(/Read 1 new or changed files; reused 2 unchanged files/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Reused declaration and call indexes for 1 unaffected files/,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: /Understand double/ }).click();
  await page
    .getByRole("button", { name: "Source context", exact: true })
    .click();
  await expect(page.locator(".source-context pre")).toContainText("x*3");
  await upload(2);
  await expect(
    page.getByText(
      "This source snapshot is already imported. Resuming saved progress.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: /Understand double/ }).click();
  await expect(page.locator(".source-context pre")).toContainText("x*2");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.locator(".project-card").filter({ hasText: "revision" }),
  ).toHaveCount(2);
  await page.reload();
  await expect(
    page.locator(".project-card").filter({ hasText: "revision" }),
  ).toHaveCount(2);
  await upload(4);
  await expect(
    page.getByText(/Loaded a previous index from saved project data/),
  ).toBeVisible();
  await expect(
    page.getByText(/Read 1 new or changed files; reused 2 unchanged files/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Reused declaration and call indexes for 1 unaffected files/,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: /Understand double/ }).click();
  await page
    .getByRole("button", { name: "Source context", exact: true })
    .click();
  await expect(page.locator(".source-context pre")).toContainText("x*4");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.locator(".project-card").filter({ hasText: "revision" }),
  ).toHaveCount(3);
});
