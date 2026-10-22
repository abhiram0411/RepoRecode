import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { palettes } from "../src/core/themes";
import { zipSync, strToU8 } from "fflate";

test("a theme choice survives reload before an IndexedDB write can start", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  // Force the timing observed in CI: the database save cannot finish before
  // navigation. The synchronous preference copy must preserve the new choice.
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<typeof original>
    ) {
      if (args[1] === "readwrite")
        throw new Error("Simulated delayed database write");
      return original.apply(this, args);
    };
  });
  await page
    .getByRole("button", { name: "Fieldwork Paper", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("device theme follows OS changes, persists and yields to a manual palette", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page
    .getByRole("button", { name: "Cyber Crimson", exact: true })
    .click();
  const follow = page.getByLabel("Follow device light/dark setting");
  await follow.check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(follow).toBeChecked();
  await follow.uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "crimson");
  await follow.check();
  await page
    .getByRole("button", { name: "Fieldwork Paper", exact: true })
    .click();
  await expect(follow).not.toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await follow.check();
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await page.getByRole("button", { name: /Understand completionRate/ }).click();
  await page
    .getByRole("button", { name: "Hide & rewrite", exact: true })
    .click();
  await expect(page.locator(".monaco-editor").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".monaco-editor").first()).toHaveCSS(
    "background-color",
    "rgb(27, 32, 28)",
  );
});
test("all 15 palettes are readable, selectable, persistent and match the source editor", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trail journal", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  for (const p of palettes) {
    const button = page.getByRole("button", { name: p.name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", p.id);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations, p.name).toEqual([]);
  }
  await page.screenshot({ path: "artifacts/themes.png", fullPage: true });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "crimson");
  await page
    .getByRole("button", { name: "Learning path", exact: true })
    .click();
  await page.getByRole("button", { name: /Understand completionRate/ }).click();
  await page
    .getByRole("button", { name: "Hide & rewrite", exact: true })
    .click();
  await expect(page.locator(".monaco-editor").first()).toHaveCSS(
    "background-color",
    "rgb(48, 24, 33)",
  );
  await expect(page.locator("main#main")).toHaveCSS("animation-name", "none");
});

test("workspace palettes never recolor imported preview content", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "colors.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "App.tsx": strToU8(
          `export function App(){return <main style={{color:'#123456',backgroundColor:'#f3eedc'}}><h1>Independent colors</h1></main>}`,
        ),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand App/ }).click();
  const render = async () => {
    await page
      .getByRole("button", { name: "Live preview", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Render current code", exact: true })
      .click();
    const frame = page.frameLocator(
      'iframe[title="Isolated React render snapshot"]',
    );
    await expect(
      frame.getByRole("heading", { name: "Independent colors" }),
    ).toBeVisible();
    await expect(frame.locator("main")).toHaveCSS("color", "rgb(18, 52, 86)");
    await expect(frame.locator("main")).toHaveCSS(
      "background-color",
      "rgb(243, 238, 220)",
    );
  };
  await render();
  for (const id of ["light", "crimson"]) {
    await page
      .getByRole("button", { name: "Preferences", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: palettes.find((p) => p.id === id)!.name,
        exact: true,
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await page
      .getByRole("button", { name: "Code workspace", exact: true })
      .click();
    await render();
  }
});
