import { test, expect } from "@playwright/test";
import { createServer } from "vite";

test("authorized GitHub imports release workspace controls for new and existing snapshots", async ({
  page,
  baseURL,
}) => {
  test.skip(
    !baseURL?.startsWith("http://127.0.0.1:"),
    "Uses an isolated local Auth fixture only.",
  );
  const server = await createServer({
    cacheDir: "tmp/github-import-e2e-vite-cache",
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
    let imports = 0;
    await page.route("**/api/github/repositories", (route) =>
      route.fulfill({
        json: {
          repositories: [
            { name: "fixture/private-sample", private: true, id: 1 },
          ],
        },
      }),
    );
    await page.route("**/api/github/import", (route) => {
      imports++;
      // Exercise parent cleanup when source processing fails after acquisition.
      if (imports === 3)
        return route.fulfill({
          json: { files: null, name: "broken", origin: "fixture" },
        });
      return route.fulfill({
        json: {
          name: "private-sample",
          origin: "github:fixture/private-sample",
          files: [
            {
              path: "math.ts",
              content:
                "export function double(n: number): number { return n * 2; }",
            },
          ],
        },
      });
    });
    await page.route("**/api/health", (route) =>
      route.fulfill({ status: 404, body: "Not configured" }),
    );
    await page.goto("http://127.0.0.1:" + address.port);
    for (const iteration of [0, 1]) {
      await page
        .getByRole("button", { name: "Import project", exact: true })
        .first()
        .click();
      await page
        .getByRole("button", { name: "Load repositories", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "fixture/private-sample PRIVATE",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", { name: "private-sample", exact: true }),
      ).toBeVisible();
      if (iteration === 1)
        await expect(
          page.getByText(
            "This source snapshot is already imported. Resuming saved progress.",
            { exact: true },
          ),
        ).toBeVisible();
      await page
        .getByRole("button", { name: "Import project", exact: true })
        .first()
        .click();
      await expect(
        page.getByRole("button", { name: "Close import", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", {
          name: "Upload a ZIP Up to 5 MiB compressed",
          exact: true,
        }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Close import", exact: true })
        .click();
    }
    expect(imports).toBe(2);
    await expect(
      page.getByRole("button", { name: "private-sample", exact: true }),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "Import project", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Load repositories", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "fixture/private-sample PRIVATE",
        exact: true,
      })
      .click();
    await expect(
      page.locator(".connected-repos").getByRole("status"),
    ).toContainText(/Error/);
    await expect(
      page.getByRole("button", { name: "Close import", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Close import", exact: true })
      .click();
    expect(imports).toBe(3);
  } finally {
    await server.close();
  }
});
