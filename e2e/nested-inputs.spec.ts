import { selectAllCode } from "./helpers/editor";
import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("nested named inputs grade missing inner fields and retain progress", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "GitHub", exact: true }),
  ).toHaveAttribute("href", "https://github.com/abhiram0411/RepoRecode");
  await page.getByRole("button", { name: "Support", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open GitHub issues" }),
  ).toHaveAttribute("href", "https://github.com/abhiram0411/RepoRecode/issues");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const fn =
    'export function present(input:Input){return !input.settings?1:!("flag" in input.settings)?2:input.settings.flag===undefined?3:input.settings.flag?4:5;}';
  const original = "interface Input {settings?:{flag?:boolean}} " + fn;
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "nested.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync({ "nested.ts": strToU8(original) })),
  });
  await page.getByRole("button", { name: /Understand present/ }).click();
  await page
    .getByRole("button", { name: "Hide & rewrite", exact: true })
    .click();
  await expect(page.locator(".practice-brief")).toContainText(
    "Input type definitions",
  );
  const editor = page.getByRole("textbox", {
    name: "Practice code",
    exact: true,
  });
  await editor.waitFor();
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(
    fn.replace('!("flag" in input.settings)?2:', ""),
  );
  const run = page.getByRole("button", { name: "Run checks", exact: true });
  await run.click();
  await expect(run).toBeEnabled({ timeout: 30000 });
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible();
  await expect(
    page.getByText('Input [({["settings"]:({})})]', { exact: true }),
  ).toBeVisible();
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(fn);
  await run.click();
  await expect(run).toBeEnabled({ timeout: 30000 });
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/nested-practice.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Support", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open GitHub issues" }),
  ).toBeVisible();
  await expect(
    page.getByText("A separate support email is not configured.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/support-mobile.png",
    fullPage: true,
  });
});
