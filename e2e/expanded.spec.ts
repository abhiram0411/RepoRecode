import { selectAllCode } from "./helpers/editor";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("profile customization and companion preferences survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Display name").fill("River");
  await page
    .getByRole("combobox", { name: "Companion", exact: true })
    .selectOption("girl");
  await page
    .getByRole("combobox", { name: "Hair", exact: true })
    .selectOption("long");
  await page.getByLabel("Clothing").selectOption("hoodie");
  await page.getByLabel("Glasses", { exact: true }).check();
  await page.getByLabel("Cap", { exact: true }).check();
  await page
    .getByRole("combobox", { name: "Size", exact: true })
    .selectOption("large");
  await page
    .getByRole("combobox", { name: "Position", exact: true })
    .selectOption("right");
  await expect(page.locator(".companion")).toHaveAttribute(
    "data-position",
    "right",
  );
  await page.getByLabel("Show companion", { exact: true }).uncheck();
  await expect(page.locator(".companion")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(page.getByLabel("Display name")).toHaveValue("River");
  await expect(page.getByLabel("Glasses", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Cap", { exact: true })).toBeChecked();
  await page.getByLabel("Show companion", { exact: true }).check();
  await page.getByRole("button", { name: "Greet Mira, Coding Pet" }).click();
  await expect(
    page.getByRole("region", { name: "Coding Pet", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Minimize pet" }).click();
  await expect(
    page.getByRole("region", { name: "Coding Pet", exact: true }),
  ).toBeHidden();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: "artifacts/profile.png", fullPage: true });
});
test("feature mission uses the changed output contract and saves interview reflection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await page.getByRole("button", { name: /Understand completionRate/ }).click();
  await page
    .getByText("Project interview · explain your decisions", { exact: true })
    .click();
  await page
    .getByLabel("Your explanation")
    .fill(
      "The guard handles a zero total. The remaining result is clamped to a percentage.",
    );
  await page
    .getByRole("button", { name: "Save explanation", exact: true })
    .click();
  await expect(page.getByText(/Explanation saved/)).toBeVisible();
  await page
    .getByRole("button", { name: "Modify a feature", exact: true })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Practice code",
    exact: true,
  });
  await editor.waitFor();
  await editor.focus();
  await selectAllCode(page);
  await page.keyboard.insertText(
    "function completionRate(completed:number,total:number):number { if(total<=0)return 0;return Math.round(Math.min(100,Math.max(0,(completed/total)*100)))*2; }",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Learning path", exact: true })
    .click();
  await expect(page.getByText(/1 feature missions completed/)).toBeVisible();
  await expect(
    page.locator(".campaign-summary").getByText("0 XP", { exact: true }),
  ).toBeVisible();
});
