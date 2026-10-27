import { selectAllCode } from "./helpers/editor";
import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("imported named input types are visible and usable during practice", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const code =
    "export function score(input:Payload){return input.count+(input.enabled?10:0);}";
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "named-inputs.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "types.ts": strToU8(
          "export interface Shape {readonly count:number;enabled:boolean}",
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
  const editor = page.getByRole("textbox", {
    name: "Practice code",
    exact: true,
  });
  await editor.waitFor();
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(
    "function score(input:Payload){return input.count;}",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible();
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/named-practice.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
});
