import { test, expect } from "@playwright/test";
import { preview, type PreviewServer } from "vite";

let server: PreviewServer;
let origin: string;
test.beforeAll(async () => {
  // Serve real HTTP responses. Browser-route fulfillment loses the response's
  // network address space and triggers Chromium's local-network access guard
  // for an opaque frame fetching its bridge, unrelated to the CSP under test.
  server = await preview({
    configFile: false,
    preview: {
      host: "127.0.0.1",
      port: 0,
      headers: {
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.github.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
        "X-Frame-Options": "DENY",
      },
    },
  });
  const address = server.httpServer.address();
  if (!address || typeof address === "string")
    throw Error("Missing fixture address");
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server?.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
});

test("preview bridge works without origin access or permission to execute injected scripts", async ({
  page,
}) => {
  // Match the packaged server's script policy: the external bridge must work
  // without allowing inline JavaScript or eval in either document.
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await page.getByRole("button", { name: /Understand completionRate/ }).click();
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  await page.getByLabel("Preview mode").selectOption("interactive");
  await page.getByLabel("Inspect source locations").uncheck();
  await page
    .getByRole("button", { name: "Render current code", exact: true })
    .click();
  const iframe = page.locator('iframe[title="Isolated React render snapshot"]');
  const frame = iframe.contentFrame();
  await expect(frame.getByText("0% complete", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
  const isolation = await frame.locator("body").evaluate(async () => {
    const denied = (action: () => unknown) => {
      try {
        action();
        return false;
      } catch {
        return true;
      }
    };
    const parentDenied = denied(() => parent.document.body);
    const storageDenied = denied(() => localStorage.getItem("project"));
    const script = document.createElement("script");
    script.textContent = "window.injectedPreviewScript=true";
    document.body.append(script);
    const button = document.createElement("button");
    button.setAttribute("onclick", "window.injectedPreviewHandler=true");
    document.body.append(button);
    button.click();
    const networkDenied = await fetch(
      "https://example.invalid/preview-probe",
    ).then(
      () => false,
      () => true,
    );
    return {
      parentDenied,
      storageDenied,
      networkDenied,
      scriptRan: !!(window as any).injectedPreviewScript,
      handlerRan: !!(window as any).injectedPreviewHandler,
    };
  });
  expect(isolation).toEqual({
    parentDenied: true,
    storageDenied: true,
    networkDenied: true,
    scriptRan: false,
    handlerRan: false,
  });
  await frame.getByRole("button", { name: "Complete a stage" }).click();
  await expect(frame.getByText("20% complete", { exact: true })).toBeVisible();
});
