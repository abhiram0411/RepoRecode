import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
import { selectAllCode } from "./helpers/editor";

for (const generic of [false, true]) {
  test(`imported structural constraints preserve type context and grade ${generic ? "generic" : "concrete"} practice`, async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Import a project", exact: true })
      .click();
    const signature = generic
      ? "double<T extends Payload<{readonly value:number}>>(input:T)"
      : "double(input:Payload<{readonly value:number}>)";
    const code = `export function ${signature}{return input.value*2}`;
    await page.locator('input[type=file][accept=".zip"]').setInputFiles({
      name: "structural-input.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(
        zipSync({
          "types.ts": strToU8(
            "export interface Bound {readonly value:number} export type Input<T extends Bound>=T;",
          ),
          "main.ts": strToU8(
            'import type {Input as Payload} from "./types";' + code,
          ),
        }),
      ),
    });
    await page.getByRole("button", { name: /Understand double/ }).click();
    await page
      .getByRole("button", { name: "Hide & rewrite", exact: true })
      .click();
    await page.getByText("Input type definitions", { exact: true }).click();
    await expect(page.locator(".practice-types pre")).toContainText(
      'type Payload<T extends { readonly "value": number }>',
    );
    const editor = page.getByRole("textbox", {
      name: "Practice code",
      exact: true,
    });
    await editor.focus();
    await selectAllCode(page);
    await page.keyboard.insertText(`function ${signature}{return input.value}`);
    await page.getByRole("button", { name: "Run checks", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible(
      {
        timeout: 30000,
      },
    );
    await editor.focus();
    await selectAllCode(page);
    await page.keyboard.insertText(code);
    await page.getByRole("button", { name: "Run checks", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Behavior verified", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await page.reload();
    await expect(
      page.locator(".card-progress").getByText("1 / 1", { exact: true }),
    ).toBeVisible();
  });
}
