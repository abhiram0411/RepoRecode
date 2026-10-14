import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("overview and import dialog meet automated WCAG AA checks", async ({
  page,
}) => {
  await page.goto("/");
  let result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await expect(
    page.getByRole("button", { name: "Close import", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((e) => e.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close import", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Import a project", exact: true }),
  ).toBeFocused();
});
