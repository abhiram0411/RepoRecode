import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
test("state property chains expose intermediate source links and static graph labels", async ({
  page,
}) => {
  const code = `import {useState} from 'react';
export function App(){const [count,setCount]=useState({value:0});
const doubled=count.value*2;
const label=\`Total: \${doubled}\`;
return <output title={label}>{doubled}</output>;
}`;
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "state-chain.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync({ "App.tsx": strToU8(code) })),
  });
  await page.getByText(/Explore the project index ·/).click();
  const list = page.getByRole("list", { name: "Static state relationships" });
  const prop = list.locator("li").filter({ hasText: "title on output" });
  await expect(prop).toContainText("count");
  await expect(
    prop.getByRole("button", { name: "doubled · App.tsx:3", exact: true }),
  ).toBeVisible();
  await expect(
    prop.getByRole("button", { name: "label · App.tsx:4", exact: true }),
  ).toBeVisible();
  await prop
    .getByRole("button", { name: "doubled · App.tsx:3", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Get to know App", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "State relationships", exact: true })
    .click();
  const picker = page.getByRole("combobox", {
    name: "Inspect state relationship",
  });
  const propOption = await picker
    .getByRole("option", { name: /count → title on output/ })
    .getAttribute("value");
  await picker.selectOption(propOption!);
  await expect(page.locator(".graph")).toContainText(
    "prop reference via doubled → label · static",
  );
  await expect(page.locator(".graph")).toContainText(
    "not execution order or observed changes",
  );
  await page
    .getByRole("button", { name: "Via label: App.tsx:4", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Get to know App", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/state-derivations.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(picker).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
