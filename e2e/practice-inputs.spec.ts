import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("nullable/default input exercises preserve their contract and grade missing inputs", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const original =
    'export function choose(mode:"on"|"off", value:number|null=5){return mode==="off"?0:value===null?-1:value;}';
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "inputs.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync({ "inputs.ts": strToU8(original) })),
  });
  await page.getByRole("button", { name: /Understand choose/ }).click();
  await page
    .getByRole("button", { name: "Hide & rewrite", exact: true })
    .click();
  await expect(
    page.locator(".practice-brief").getByText(/value:number\|null=5/),
  ).toBeVisible();
  const editor = page.locator(".monaco-editor textarea").first();
  await editor.waitFor();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    'function choose(mode:"on"|"off", value:number|null=99){return mode==="off"?0:value===null?-1:value;}',
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible();
  await expect(
    page.getByText('Input ["on",undefined]', { exact: true }),
  ).toBeVisible();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(original);
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
  // Simulate a pre-upgrade saved index while retaining actual earned progress.
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open("reporecode", 1);
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result,
          tx = db.transaction("projects", "readwrite");
        const rows = tx.objectStore("projects").getAll();
        rows.onsuccess = () => {
          const project = rows.result[0];
          delete project.analysisVersion;
          project.notes ??= {};
          project.notes[project.analysis.symbols[0].id] =
            "Keep this explanation";
          tx.objectStore("projects").put(project);
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Learning path", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh source analysis", exact: true })
    .click();
  await expect(
    page.getByText(
      "Source analysis refreshed. Your drafts, notes and learning progress were kept.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh source analysis", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".campaign-summary").getByText("100 XP", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Understand choose/ }).click();
  await page
    .getByText("Project interview · explain your decisions", { exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: /explanation/i })).toHaveValue(
    "Keep this explanation",
  );
});
