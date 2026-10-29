import { selectAllCode } from "./helpers/editor";
import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("bounded generic functions and dependent contracts support async practice, incorrect answers and saved progress", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const code =
    "export async function score<T extends number,U extends T=T>(input:Payload<U>):Promise<number>{const n=await Promise.resolve(input.value);return n+(input.enabled?10:0)}";
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "generic-async.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "base.ts": strToU8("export interface Base<T>{readonly value:T}"),
        "types.ts": strToU8(
          "import type {Base} from './base';export interface Shape<T extends number=number,U extends T=T> extends Base<U>{enabled:boolean}",
        ),
        "main.ts": strToU8(
          "import type {Shape as Payload} from './types';" + code,
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
    "type Payload<T extends number = number, U extends T = T>",
  );
  const editor = page.getByRole("textbox", {
    name: "Practice code",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await expect(
    page
      .locator(".monaco-editor .view-lines")
      .filter({ hasText: "async function score" }),
  ).toContainText("U extends T=T");
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(
    "async function score(input:Payload<number>){return await Promise.resolve(input.value)}",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible({
    timeout: 30000,
  });
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("link", { name: "Skip to workspace content", exact: true }),
  ).not.toBeInViewport();
  await page.screenshot({
    path: "artifacts/generic-async-practice.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
});
