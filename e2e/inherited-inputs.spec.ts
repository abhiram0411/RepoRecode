import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("inherited input fields keep readonly checks and practice completion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const code =
    "export function score(input:Payload){return input.count+(input.enabled?10:0);}";
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "inherited-inputs.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "base.ts": strToU8("export interface Base {readonly count:number}"),
        "types.ts": strToU8(
          "import type {Base} from './base'; export interface Shape extends Base {enabled:boolean}",
        ),
        "main.ts": strToU8(
          `import type {Shape as Payload} from './types';${code}`,
        ),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand score/ }).click();
  await page
    .getByRole("button", { name: "Hide & rewrite", exact: true })
    .click();
  await page.getByText("Input type definitions", { exact: true }).click();
  await expect(page.locator(".practice-types pre")).toContainText(
    "type Payload",
  );
  await expect(page.locator(".practice-types pre")).toContainText(
    'readonly "count": number',
  );
  const editor = page.locator(".monaco-editor textarea").first();
  await editor.waitFor();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    "function score(input:Payload){return input.count;}",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__node').filter({hasText:'base.ts'})).toBeVisible();
  await page.screenshot({
    path: "artifacts/inherited-practice.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
});
