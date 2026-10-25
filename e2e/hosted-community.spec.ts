import { test, expect } from "@playwright/test";

test("feedback retries reuse their submission identifier and disclose hosted retention", async ({
  page,
  baseURL,
}) => {
  test.skip(
    !baseURL?.startsWith("http://127.0.0.1:"),
    "Local synthetic service only; never submits real feedback.",
  );
  await page.route("**/api/community/status", (route) =>
    route.fulfill({
      json: {
        feedbackEnabled: true,
        telemetryEnabled: false,
        feedbackRetentionDays: 90,
      },
    }),
  );
  const requests: { id: string | undefined; body: unknown }[] = [];
  await page.route("**/api/feedback", (route) => {
    requests.push({
      id: route.request().headers()["idempotency-key"],
      body: route.request().postDataJSON(),
    });
    return route.fulfill(
      requests.length < 4
        ? { status: 503, json: { error: "Temporary fixture outage." } }
        : {
            status: 201,
            json: requests.length === 4 ? {} : { received: true },
          },
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(
    page.getByText("Feedback older than 90 days", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Your feedback")
    .fill("Please add keyboard shortcut help.");
  const send = page.getByRole("button", { name: "Send feedback", exact: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt === 2)
      await page
        .getByLabel("Your feedback")
        .fill("Please add more source navigation shortcuts.");
    await send.click();
    await expect(
      page.getByText("Error: Temporary fixture outage.", { exact: true }),
    ).toBeVisible();
    await expect(send).toBeEnabled();
  }
  await send.click();
  await expect(
    page.getByText(
      "Error: The service did not confirm this request. Your form has been kept so you can retry.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByText(
      "Feedback received. Thank you for helping improve RepoRecode.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(requests).toHaveLength(5);
  expect(requests[0].id).toMatch(/^[0-9a-f-]{36}$/);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[2].id).not.toBe(requests[0].id);
  expect(requests[3]).toEqual(requests[2]);
  expect(requests[4]).toEqual(requests[2]);
  await expect(page.getByLabel("Your feedback")).toHaveValue("");
});
