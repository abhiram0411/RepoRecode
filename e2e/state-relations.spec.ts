import { test, expect } from "@playwright/test";

test("static state relationships link source facts and graph nodes back to code", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the sample", exact: true })
    .click();
  await page.getByText(/Explore the project index ·/).click();
  const relations = page.getByRole("list", {
    name: "Static state relationships",
  });
  await expect(
    relations.getByText("state referenced in prop", { exact: false }),
  ).toBeVisible();
  await expect(
    relations.getByText("setCompleted(completed + 1)", { exact: true }),
  ).toBeVisible();
  await relations
    .getByRole("button", { name: "State: src/App.tsx:4", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Get to know App", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "State relationships", exact: true })
    .click();
  const state = page
    .locator(".react-flow__node")
    .filter({ hasText: "completed · useState · line 4" });
  await expect(state).toBeVisible();
  await state.click();
  await expect(
    page.getByRole("heading", { name: "Get to know App", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".graph").getByText(/not execution order or observed changes/),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/state-relationships.png",
    fullPage: true,
  });
});
