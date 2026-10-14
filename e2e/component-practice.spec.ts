import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
test("component reconstruction checks props-dependent renders and persists progress", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "component.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "Card.tsx": strToU8(
          "export function Card({count,label}:{count:number;label:string}) {return <p title={label}>{count*2}</p>;}",
        ),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand Card/ }).click();
  await page
    .getByRole("button", { name: "Reconstruct component", exact: true })
    .click();
  const editor = page.locator(".monaco-editor textarea").first();
  await editor.waitFor();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    "function Card({count,label}:{count:number;label:string}) { return <p title={label}>{0}</p>; }",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible({
    timeout: 30000,
  });
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    "function Card({count,label}:{count:number;label:string}) { const result=count+count; return <p title={label}>{result}</p>; }",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Initial render verified", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByText(/Finite initial-render DOM probes only/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Learning path", exact: true })
    .click();
  await expect(
    page.locator(".campaign-summary").getByText("100 XP", { exact: true }),
  ).toBeVisible();
});
