import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("CSS modules keep same-named styles separate through interactive previews", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("evil.test")) requests.push(request.url());
  });
  await page.goto("/");
  const hostBackground = await page
    .locator("body")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "css-modules.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "App.tsx":
          strToU8(`import styles from './app.module.css';import other from './other.module.css';import {useState} from 'react';
export function double(n:number){return n*2}
export default function App(){const [n,setN]=useState(0);return <main className={styles.card} id={styles.root}><h1>Scoped local styles</h1><p className={other.card}>Independent card</p><button className={styles.counter} onClick={()=>setN(n+1)}>Count {n}</button></main>}`),
        "app.module.css": strToU8(
          `.card{padding:24px;color:rgb(30,60,90);&>h1{font-size:26px}& .counter{color:white;background:#123456;padding:14px;border:0;&:hover{background:#305070}background-image:url(https://evil.test/module)}}#root{display:grid;gap:16px}`,
        ),
        "other.module.css": strToU8(
          `.card{color:rgb(120,40,80);padding:8px;border:2px solid currentColor}`,
        ),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand double/ }).click();
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  const frame = page.frameLocator(
    'iframe[title="Isolated React render snapshot"]',
  );
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(frame.locator("main")).toHaveCSS("color", "rgb(30, 60, 90)", {
    timeout: 30000,
  });
  await expect(frame.locator("main")).toHaveCSS("display", "grid");
  await expect(frame.locator("p")).toHaveCSS("color", "rgb(120, 40, 80)");
  await expect(frame.locator("h1")).toHaveCSS("font-size", "26px");
  expect(await frame.locator("main").getAttribute("class")).not.toBe(
    await frame.locator("p").getAttribute("class"),
  );
  await page
    .getByText("Styles omitted from this preview", { exact: true })
    .click();
  await expect(
    page.getByText(
      "app.module.css: 1 unsupported CSS rules or declarations omitted.",
    ),
  ).toBeVisible();
  await page.getByLabel("Preview mode").selectOption("interactive");
  await page.getByLabel("Inspect source locations").uncheck();
  await page.getByRole("button", { name: "Render current code" }).click();
  const button = frame.getByRole("button", { name: "Count 0", exact: true });
  await expect(button).toHaveAttribute("data-rr-events", "click", {
    timeout: 30000,
  });
  await button.click();
  const updated = frame.getByRole("button", { name: "Count 1", exact: true });
  await expect(updated).toBeVisible();
  await updated.hover();
  await expect(updated).toHaveCSS("background-color", "rgb(48, 80, 112)");
  await expect(updated).toHaveCSS("background-image", "none");
  await expect(frame.locator("main")).toHaveCSS("color", "rgb(30, 60, 90)");
  await expect(frame.locator("p")).toHaveCSS("color", "rgb(120, 40, 80)");
  expect(
    (await frame.locator("style").allTextContents()).join("\n"),
  ).not.toContain("evil.test");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    hostBackground,
  );
  expect(requests).toEqual([]);
  await page.screenshot({ path: "artifacts/css-modules.png", fullPage: true });
});
