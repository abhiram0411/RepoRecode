import { test, expect } from "@playwright/test";
import { strToU8, zipSync } from "fflate";

test("local CSS renders in isolation, stays through interactions and cannot fetch resources", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("evil.test")) requests.push(request.url());
  });
  await page.goto("/");
  const outerBackground = await page
    .locator("body")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "styled.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "App.tsx": strToU8(`import './app.css';import {useState} from 'react';
        export function double(n:number){return n*2}
        export default function App(){const [n,setN]=useState(0);return <main className="card"><h1>Local stylesheet preview</h1><p>Styles travel with your project.</p><button className="counter" onClick={()=>setN(n+1)}>Count {n}</button></main>}`),
        "app.css":
          strToU8(`@import url(https://evil.test/import);@font-face{font-family:bad;src:url(https://evil.test/font)}
        :root{--ink:#123456}body{background:#edf2f7}.card{padding:24px;border-radius:16px;background:white;color:var(--ink);display:grid;gap:16px}
        .card h1{font-size:28px;margin:0}.counter{background:#123456;color:white;padding:12px;border:0;border-radius:8px;cursor:pointer}
        .counter{background-image:url(https://evil.test/image)}@media (max-width:5000px){.card{border:3px solid rgb(80,120,160)}}`),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand double/ }).click();
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  const frame = page.frameLocator(
    'iframe[title="Isolated React render snapshot"]',
  );
  await page.getByRole("button", { name: "Render current code" }).click();
  await expect(frame.locator(".card")).toHaveCSS("color", "rgb(18, 52, 86)");
  await expect(frame.locator(".card")).toHaveCSS("border-top-width", "3px");
  await expect(frame.locator("body")).toHaveCSS(
    "background-color",
    "rgb(237, 242, 247)",
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    outerBackground,
  );
  await page
    .getByText("Styles omitted from this preview", { exact: true })
    .click();
  await expect(
    page.getByText("app.css: 3 unsupported CSS rules or declarations omitted."),
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
  await expect(frame.locator(".counter")).toHaveCSS(
    "background-color",
    "rgb(18, 52, 86)",
  );
  await expect(frame.locator(".counter")).toHaveCSS("background-image", "none");
  expect(requests).toEqual([]);
  await page.screenshot({
    path: "artifacts/styled-preview.png",
    fullPage: true,
  });
});
