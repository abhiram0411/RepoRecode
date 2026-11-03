import { test, expect } from "@playwright/test";

test("overview spotlight respects motion choices and preserves keyboard navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Understand completionRate/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const card = page.locator(".spotlight-card");
  await expect(card).toHaveCount(1);
  await card.hover();
  await expect(card).toHaveAttribute("data-spotlight-active", "true");
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el, "::before").opacity))
    .toBe("1");
  await page.screenshot({
    path: "artifacts/overview-spotlight.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el, "::before").display))
    .toBe("none");
  const next = card.getByRole("button", {
    name: "Continue learning",
    exact: true,
  });
  await next.focus();
  await expect(next).toBeFocused();
  await next.press("Enter");
  await expect(
    page.getByRole("button", { name: /Understand completionRate/ }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Enable gentle animations", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await card.hover();
  await expect(card).toHaveAttribute("data-spotlight-enabled", "false");
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el, "::before").display))
    .toBe("none");
});
