import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
import { selectAllCode } from "./helpers/editor";

test("string and boolean missions save distinct progress without awarding rewrite mastery", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "missions.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "missions/functions.ts": strToU8(
          "export function greeting(name:string):string {return 'hello '+name;}\nexport function positive(n:number):boolean {return n>0;}",
        ),
      }),
    ),
  });
  for (const mission of [
    {
      name: "greeting",
      contract: "uppercase-output",
      requirement: "converted to uppercase",
      code: "function greeting(name:string):string {return ('hello '+name).toUpperCase();}",
      count: 1,
    },
    {
      name: "positive",
      contract: "negate-output",
      requirement: "opposite of",
      code: "function positive(n:number):boolean {return n<=0;}",
      count: 2,
    },
  ]) {
    await page
      .getByRole("button", { name: new RegExp("Understand " + mission.name) })
      .click();
    await expect(
      page.getByRole("button", { name: /Independent mission/ }),
    ).toBeDisabled();
    await page
      .getByRole("combobox", { name: "Feature mission", exact: true })
      .selectOption(mission.contract);
    await page
      .getByRole("button", { name: "Modify a feature", exact: true })
      .click();
    await expect(page.locator(".practice-brief")).toContainText(
      mission.requirement,
    );
    await page.getByRole("button", { name: "Run checks", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Behavior verified", exact: true }),
    ).toHaveCount(0);
    // Wait for the unchanged reference to finish failing before editing.
    await expect(page.getByText(/probes differ/)).toBeVisible({
      timeout: 30000,
    });
    const editor = page.getByRole("textbox", {
      name: "Practice code",
      exact: true,
    });
    await editor.focus();
    await selectAllCode(page);
    await page.keyboard.insertText(mission.code);
    await page.getByRole("button", { name: "Run checks", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Behavior verified", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Learning path", exact: true })
      .click();
    await expect(
      page.getByText(new RegExp(mission.count + " feature missions completed")),
    ).toBeVisible();
    await expect(
      page.locator(".campaign-summary").getByText("0 XP", { exact: true }),
    ).toBeVisible();
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Learning path", exact: true })
    .click();
  await expect(page.getByText(/2 feature missions completed/)).toBeVisible();
  await page.screenshot({
    path: "artifacts/feature-missions-progress.png",
    fullPage: true,
  });
});
