import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { zipSync, strToU8 } from "fflate";

test("learning, source study and practice controls pass automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "accessible.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "math.ts": strToU8(
          "export function double(n:number):number{return n*2}",
        ),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand double/ }).waitFor();
  async function audit(label: string) {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, label).toEqual([]);
  }
  await audit("Learning path");
  await page.getByRole("button", { name: /Understand double/ }).click();
  await expect(
    page.getByRole("heading", { name: "Get to know double" }),
  ).toBeVisible();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Source code (read only)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "01 / Learn", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Source context", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Source context", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Technical flow", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await audit("Source study");
  await page.getByRole("button", { name: "Hide & rewrite" }).click();
  await expect(
    page.getByRole("button", { name: "Run checks", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Practice code", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "02 / Practice", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await audit("Practice editor");
});

test("keyboard users can skip navigation, follow page changes and dismiss profile options", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", {
    name: "Skip to workspace content",
    exact: true,
  });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.screenshot({
    path: "artifacts/keyboard-navigation.png",
    fullPage: true,
  });
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const preferences = page.getByRole("button", {
    name: "Preferences",
    exact: true,
  });
  await preferences.focus();
  await page.keyboard.press("Enter");
  await expect(preferences).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).not.toHaveAttribute("aria-current", "page");
  await expect(page.locator("main")).toBeFocused();
  const profile = page.getByRole("button", {
    name: "Account and profile settings",
    exact: true,
  });
  await profile.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Profile and preferences", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(profile).toBeFocused();
  await expect(profile).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(profile).toHaveAttribute("aria-expanded", "false");
});
