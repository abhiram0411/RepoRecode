import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("linked folder detects changed source and imports a separate snapshot", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = {
      text: "export function double(x:number){return x*2}",
      denied: false,
    };
    (window as any).folderFixture = state;
    (window as any).showDirectoryPicker = async (options: any) => {
      if (options.mode !== "read") throw Error("Expected read-only access");
      return {
        kind: "directory",
        name: "linked-demo",
        async *values() {
          if (state.denied)
            throw new DOMException("Permission denied", "NotAllowedError");
          yield {
            kind: "file",
            name: "math.ts",
            getFile: async () => new File([state.text], "math.ts"),
          };
        },
      };
    };
  });
  await page.clock.install();
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Linked local folder" });
  await panel.locator("summary").click();
  await panel
    .getByRole("button", { name: "Link a local folder", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("1 source files ready");
  await panel
    .getByRole("button", { name: "Import linked folder", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("snapshot imported");
  await page.evaluate(() => {
    (window as any).folderFixture.text =
      "export function double(x:number){return x*3}";
  });
  await panel.getByRole("checkbox").check();
  await page.clock.fastForward(16000);
  await expect(panel.getByRole("status")).toContainText(
    "0 added, 1 changed, 0 removed",
  );
  await panel
    .getByRole("button", { name: "Import changes", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("snapshot imported");
  const projects = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("reporecode");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<any[]>((resolve, reject) => {
        const r = db.transaction("projects").objectStore("projects").getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
  expect(projects).toHaveLength(2);
  expect(projects.map((p) => p.files[0].content).sort()).toEqual([
    "export function double(x:number){return x*2}",
    "export function double(x:number){return x*3}",
  ]);
  await page.evaluate(() => {
    (window as any).folderFixture.denied = true;
  });
  await panel
    .getByRole("button", { name: "Check folder changes", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("Permission denied");
  await expect(
    panel.getByRole("button", { name: "Import changes", exact: true }),
  ).toBeDisabled();
  await panel
    .getByRole("button", { name: "Disconnect folder", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Saved projects remain",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("ordinary imports remain available when directory linking is unsupported", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "showDirectoryPicker", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Linked local folder" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Import a project", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Choose a folder/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Upload a ZIP/ }),
  ).toBeVisible();
});
