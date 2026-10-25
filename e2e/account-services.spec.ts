import { test, expect } from "@playwright/test";
import { createServer } from "vite";

test("account deletion stays unavailable without a backend and requires confirmed success", async ({
  page,
  baseURL,
}) => {
  test.skip(
    !baseURL?.startsWith("http://127.0.0.1:"),
    "Uses an isolated local Auth fixture only.",
  );
  const server = await createServer({
    cacheDir: "tmp/account-e2e-vite-cache",
    server: { host: "127.0.0.1", port: 0, open: false },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        "https://account-test.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        "sb_publishable_fixture",
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(""),
      "import.meta.env.VITE_AUTH_IDENTITY_LINKING": JSON.stringify("false"),
    },
  });
  await server.listen();
  try {
    const address = server.httpServer!.address();
    if (!address || typeof address === "string")
      throw Error("Local fixture failed to listen");
    const user = {
      id: "11111111-1111-4111-8111-111111111111",
      aud: "authenticated",
      email: "fixture@example.invalid",
      app_metadata: { provider: "github", providers: ["github"] },
      user_metadata: {},
      identities: [
        {
          id: "github-fixture",
          provider: "github",
          user_id: "11111111-1111-4111-8111-111111111111",
          identity_data: {},
        },
      ],
      created_at: "2026-01-01T00:00:00Z",
      factors: [],
    };
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const access = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: expires, aal: "aal1" })).toString("base64url")}.fixture`;
    await page.addInitScript(
      ({ user, expires, access }) => {
        localStorage.setItem(
          "sb-account-test-auth-token",
          JSON.stringify({
            access_token: access,
            refresh_token: "fixture",
            token_type: "bearer",
            expires_at: expires,
            expires_in: 3600,
            user,
          }),
        );
      },
      { user, expires, access },
    );
    await page.route("https://account-test.supabase.co/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/auth/v1/user") return route.fulfill({ json: user });
      if (path === "/auth/v1/settings")
        return route.fulfill({
          json: {
            external: { github: true, google: false, email: false },
            disable_signup: true,
          },
        });
      if (path === "/auth/v1/logout") return route.fulfill({ status: 204 });
      await route.abort();
    });
    let enabled = false,
      confirmed = false;
    const deletions: string[] = [];
    await page.route("**/api/health", (route) =>
      route.fulfill(
        enabled
          ? { json: { status: "ok", accountDeletionConfigured: true } }
          : { status: 404, body: "Not found" },
      ),
    );
    await page.route("**/api/account", (route) => {
      deletions.push(route.request().postData() ?? "");
      return route.fulfill(
        confirmed
          ? { json: { deleted: true } }
          : { contentType: "text/html", body: "<html>Static shell</html>" },
      );
    });
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page
      .getByRole("button", { name: "Preferences", exact: true })
      .click();
    await expect(
      page.getByText("Signed in as fixture@example.invalid", { exact: true }),
    ).toBeVisible();
    const remove = page.getByRole("button", {
      name: "Delete cloud account",
      exact: true,
    });
    await expect(remove).toBeDisabled();
    await expect(
      page.getByText(
        "Cloud account deletion is unavailable on this installation.",
        { exact: false },
      ),
    ).toBeVisible();
    expect(deletions).toEqual([]);
    enabled = true;
    await page
      .getByRole("button", { name: "Check deletion availability again" })
      .click();
    await expect(remove).toBeEnabled();
    page.once("dialog", (dialog) => dialog.dismiss());
    await remove.click();
    expect(deletions).toEqual([]);
    page.once("dialog", (dialog) => dialog.accept("DELETE"));
    await remove.click();
    await expect(
      page.getByText(
        "Cloud account deletion could not be confirmed. Check your account before trying again.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(remove).toBeEnabled();
    await expect(
      page.getByText("Signed in as fixture@example.invalid", { exact: true }),
    ).toBeVisible();
    confirmed = true;
    page.once("dialog", (dialog) => dialog.accept("DELETE"));
    await remove.click();
    await expect(
      page.getByText(
        "Cloud account deleted. Local device data remains until you delete it in Your data.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(remove).toHaveCount(0);
    expect(deletions).toEqual([
      '{"confirmation":"DELETE"}',
      '{"confirmation":"DELETE"}',
    ]);
    await expect(
      page.getByRole("button", { name: "Continue with github", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with google", exact: true }),
    ).toHaveCount(0);
  } finally {
    await server.close();
  }
});
