import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("inline object practice catches missing-field mistakes and saves completion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const original =
    'export function present(input:{flag?:boolean}){return !("flag" in input)?1:input.flag===undefined?2:input.flag?3:4;}';
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "objects.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync({ "objects.ts": strToU8(original) })),
  });
  await page.getByRole("button", { name: /Understand present/ }).click();
  await page
    .getByRole("button", { name: "Hide & rewrite", exact: true })
    .click();
  await expect(
    page.locator(".practice-brief").getByText(/input:\{flag\?:boolean\}/),
  ).toBeVisible();
  const editor = page.locator(".monaco-editor textarea").first();
  await editor.waitFor();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    "function present(input:{flag?:boolean}){return input.flag===undefined?2:input.flag?3:4;}",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible();
  await expect(page.getByText("Input [({})]", { exact: true })).toBeVisible();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(original);
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/object-practice.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
});
