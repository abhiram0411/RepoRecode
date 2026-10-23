import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { zipSync, strToU8 } from "fflate";

test("API candidates connect literal paths to source without executing imported requests", async ({
  page,
}) => {
  let importedRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/items") importedRequests++;
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "api-paths.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "client.ts": strToU8(
          "export async function loadItems(){\nreturn fetch('/api/items');\n}\nexport function saveItems(){return fetch('/api/items',{method:'POST'})}",
        ),
        "server.ts": strToU8(
          "import express from 'express';\nconst app=express();\nexport function installRoutes(){\napp.get('/api/items',(_req,res)=>res.json([]));\n}\napp.get('/health',(_req,res)=>res.send('ok'));",
        ),
      }),
    ),
  });
  await page.getByText(/Explore the project index ·/).click();
  const paths = page.getByRole("region", {
    name: "API request and route candidates",
  });
  await expect(
    paths.getByText("GET /api/items", { exact: true }),
  ).toBeVisible();
  await expect(
    paths.getByText("POST /api/items", { exact: true }),
  ).toBeVisible();
  await expect(paths.getByText(/No matching route found/)).toHaveCount(1);
  await paths.getByText(/Declared route paths/).click();
  const source = paths.getByRole("button", {
    name: "server.ts:6",
    exact: true,
  });
  await source.click();
  const location = page.getByRole("dialog", {
    name: "Source location",
    exact: true,
  });
  await expect(location.locator(".selected-line")).toContainText(
    "app.get('/health'",
  );
  const sourceAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(sourceAudit.violations).toEqual([]);
  await page.screenshot({ path: "artifacts/source-location.png" });
  await page.keyboard.press("Escape");
  await expect(source).toBeFocused();
  await paths
    .getByRole("button", { name: "server.ts:4", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Get to know installRoutes",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "API paths", exact: true }).click();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await page
    .locator(".react-flow__node")
    .filter({ hasText: "Route GET /health" })
    .click();
  await expect(location.locator(".selected-line")).toContainText(
    "app.get('/health'",
  );
  await location
    .getByRole("button", { name: "Back to workspace", exact: true })
    .click();
  const request = page
    .locator(".react-flow__node")
    .filter({ hasText: "Request GET /api/items" });
  await request.click();
  await expect(
    page.getByRole("heading", { name: "Get to know loadItems", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".graph").getByText(/not verified delivery/),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "artifacts/api-paths.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "API paths", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.locator(".graph-canvas").evaluate((canvas) => {
        const bounds = canvas.getBoundingClientRect();
        return Array.from(canvas.querySelectorAll(".react-flow__node")).flatMap(
          (node) => {
            const box = node.getBoundingClientRect();
            return box.left >= bounds.left &&
              box.right <= bounds.right &&
              box.top >= bounds.top &&
              box.bottom <= bounds.bottom
              ? []
              : [
                  {
                    label: node.textContent,
                    canvas: bounds.toJSON(),
                    node: box.toJSON(),
                  },
                ];
          },
        );
      }),
    )
    .toEqual([]);
  expect(
    await page
      .locator(".context-pane")
      .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/api-paths-mobile.png",
    fullPage: true,
  });
  expect(importedRequests).toBe(0);
});
