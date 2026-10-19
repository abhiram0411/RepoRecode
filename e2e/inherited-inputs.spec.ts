import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";

test("inherited input fields keep readonly checks and practice completion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  const code =
    "export function score(input:Payload){return input.count+(input.enabled?10:0);}";
  await page.locator('input[type=file][accept=".zip"]').setInputFiles({
    name: "inherited-inputs.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({
        "base.ts": strToU8("export interface Base {readonly count:number}"),
        "types.ts": strToU8(
          "import type {Base} from './base'; export interface Shape extends Base {enabled:boolean}",
        ),
        "main.ts": strToU8(
          `import type {Shape as Payload} from './types';${code}`,
        ),
      }),
    ),
  });
  await page.getByRole("button", { name: /Understand score/ }).click();
  await page
    .getByRole("button", { name: "Hide & rewrite", exact: true })
    .click();
  await page.getByText("Input type definitions", { exact: true }).click();
  await expect(page.locator(".practice-types pre")).toContainText(
    "type Payload",
  );
  await expect(page.locator(".practice-types pre")).toContainText(
    'readonly "count": number',
  );
  const editor = page.locator(".monaco-editor textarea").first();
  await editor.waitFor();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    "function score(input:Payload){return input.count;}",
  );
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Keep going/ })).toBeVisible();
  await editor.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Run checks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Behavior verified", exact: true }),
  ).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  const baseNode = page.locator(".react-flow__node").filter({
    hasText: "base.ts",
  });
  try {
    // Keep the original visibility requirement. Capture evidence only on failure.
    await expect(baseNode).toBeVisible();
  } catch (error) {
    const diagnostics = await page
      .evaluate(() => {
        const node = Array.from(
          document.querySelectorAll<HTMLElement>(".react-flow__node"),
        ).find((element) => element.textContent?.includes("base.ts"));
        function describe(element: Element | null) {
          if (!(element instanceof HTMLElement)) return null;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            className: element.className,
            hidden: element.hidden,
            ariaHidden: element.getAttribute("aria-hidden"),
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            transform: style.transform,
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y,
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight,
          };
        }
        const ancestors = [];
        let current = node ?? null;
        for (let i = 0; current && i < 8; i++, current = current.parentElement)
          ancestors.push(describe(current));
        return {
          nodeCount: document.querySelectorAll(".react-flow__node").length,
          matchingNodeCount: Array.from(
            document.querySelectorAll(".react-flow__node"),
          ).filter((element) => element.textContent?.includes("base.ts")).length,
          graph: describe(document.querySelector(".graph")),
          canvas: describe(document.querySelector(".graph-canvas")),
          viewport: describe(document.querySelector(".react-flow__viewport")),
          ancestors,
        };
      })
      .catch((captureError) => ({ captureError: String(captureError) }));
    // CI currently does not upload Playwright artifacts; emit bounded diagnostics
    // into the job log as well as attaching them to the local test result.
    console.error("Graph visibility diagnostics:", JSON.stringify(diagnostics));
    await test.info().attach("graph-visibility-diagnostics", {
      body: Buffer.from(JSON.stringify(diagnostics, null, 2)),
      contentType: "application/json",
    });
    throw error;
  }
  await page.screenshot({
    path: "artifacts/inherited-practice.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.locator(".card-progress").getByText("1 / 1", { exact: true }),
  ).toBeVisible();
});
