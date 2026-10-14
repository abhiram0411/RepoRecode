import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("predictions distinguish undefined and accept equivalent reordered objects", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "prediction.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "predict.ts": strToU8(
          "export function predict(n?:number){return n===undefined?undefined:{double:n*2,value:n};}",
        ),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand predict/ }).click();
  await page
    .getByRole("button", { name: "Start prediction challenge", exact: true })
    .click();
  const input = page.getByRole("textbox", {
    name: "Your predicted result",
    exact: true,
  });
  await input.fill("null");
  await page
    .getByRole("button", { name: "Check prediction", exact: true })
    .click();
  await expect(page.getByText(/That result differs/)).toBeVisible();
  await input.fill("undefined");
  await page
    .getByRole("button", { name: "Check prediction", exact: true })
    .click();
  await expect(page.getByText(/Correct for this input/)).toBeVisible();
  await page.getByRole("button", { name: "Next input", exact: true }).click();
  await expect(page.locator(".prediction code").first()).toHaveText(
    "predict(...[0])",
  );
  await input.fill('{"value":0,"double":0}');
  await page
    .getByRole("button", { name: "Check prediction", exact: true })
    .click();
  await expect(page.getByText(/Correct for this input/)).toBeVisible();
});
