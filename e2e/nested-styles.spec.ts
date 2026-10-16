import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("explicit nested CSS renders and survives interaction without leaking resources or host styles", async ({
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
    name: "nested-styles.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "App.tsx": strToU8(`import './app.css';import {useState} from 'react';
      export function double(n:number){return n*2}
      export default function App(){const [n,setN]=useState(0);return <main className="card"><h1>Nested local styles</h1><button className="counter" onClick={()=>setN(n+1)}>Count {n}</button></main>}`),
        "app.css":
          strToU8(`body{background:#edf2f7}.card{padding:24px;color:#123456;
        &>h1{font-size:26px;margin:0}
        & .counter{color:white;background:#123456;padding:14px;border:0;&:hover{background:#305070}background-image:url(https://evil.test/nested)}
        @media (max-width:5000px){border:3px solid rgb(80,120,160)}
        color:rgb(30,60,90);}`),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand double/ }).click();
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  const frame = page.frameLocator(
    'iframe[title="Isolated React render snapshot"]',
  );
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(frame.locator(".card")).toHaveCSS("color", "rgb(30, 60, 90)", {
    timeout: 30000,
  });
  await expect(frame.locator(".card")).toHaveCSS("border-top-width", "3px");
  await expect(frame.locator("h1")).toHaveCSS("font-size", "26px");
  await expect(frame.locator(".counter")).toHaveCSS("padding-top", "14px");
  await page
    .getByText("Styles omitted from this preview", { exact: true })
    .click();
  await expect(
    page.getByText("app.css: 1 unsupported CSS rules or declarations omitted."),
  ).toBeVisible();
  await page.getByLabel("Preview mode").selectOption("interactive");
  await page.getByLabel("Inspect source locations").uncheck();
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(
    frame.getByRole("button", { name: "Count 0", exact: true }),
  ).toHaveAttribute("data-rr-events", "click", { timeout: 30000 });
  await frame.getByRole("button", { name: "Count 0", exact: true }).click();
  await expect(
    frame.getByRole("button", { name: "Count 1", exact: true }),
  ).toBeVisible();
  await frame.locator(".counter").hover();
  await expect(frame.locator(".counter")).toHaveCSS(
    "background-color",
    "rgb(48, 80, 112)",
  );
  await expect(frame.locator(".counter")).toHaveCSS("background-image", "none");
  expect(await frame.locator("style").allTextContents()).not.toEqual(
    expect.arrayContaining([expect.stringContaining("evil.test")]),
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    hostBackground,
  );
  expect(requests).toEqual([]);
  await page.screenshot({
    path: "artifacts/nested-styles.png",
    fullPage: true,
  });
});
