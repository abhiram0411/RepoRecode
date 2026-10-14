import { describe, it, expect } from "vitest";
// @ts-expect-error JavaScript gateway has injected test boundaries.
import { createGateway } from "../server/index.mjs";
async function request(
  path: string,
  init?: RequestInit,
  options?: Record<string, unknown>,
) {
  const server = createGateway({
    env: { NODE_ENV: "test", APP_ORIGIN: "https://app.example" },
    ...options,
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    return await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      init,
    );
  } finally {
    await new Promise<void>((r) => server.close(r));
  }
}
describe("gateway boundaries", () => {
  it("rejects administrator access from ordinary users even with spoofed user metadata", async () => {
    const token =
      "x." +
      Buffer.from(JSON.stringify({ aal: "aal2" })).toString("base64url") +
      ".x";
    const r = await request(
      "/api/admin",
      {
        headers: {
          origin: "https://app.example",
          authorization: `Bearer ${token}`,
        },
      },
      {
        authenticate: async () => ({
          id: "u1",
          user_metadata: { role: "admin" },
        }),
      },
    );
    expect(r.status).toBe(403);
  });
  it("requires MFA in addition to an administrator role", async () => {
    const token =
      "x." +
      Buffer.from(JSON.stringify({ aal: "aal1" })).toString("base64url") +
      ".x";
    const r = await request(
      "/api/admin",
      {
        headers: {
          origin: "https://app.example",
          authorization: `Bearer ${token}`,
        },
      },
      {
        authenticate: async () => ({
          id: "u1",
          app_metadata: { role: "admin" },
        }),
      },
    );
    expect(r.status).toBe(403);
  });
  it("returns measured admin metrics with verified role and MFA", async () => {
    const token =
      "x." +
      Buffer.from(JSON.stringify({ aal: "aal2" })).toString("base64url") +
      ".x";
    const r = await request(
      "/api/admin",
      {
        headers: {
          origin: "https://app.example",
          authorization: `Bearer ${token}`,
        },
      },
      {
        authenticate: async () => ({
          id: "u1",
          app_metadata: { role: "admin" },
        }),
      },
    );
    expect(r.status).toBe(200);
    expect((await r.json()).infrastructureMetrics).toBe(null);
  });
  it("deletes only the authenticated account and rejects a target ID in the request", async () => {
    let deleted = "";
    const opts = {
      authenticate: async () => ({ id: "owner" }),
      deleteAccount: async (id: string) => {
        deleted = id;
      },
    };
    const headers = {
      origin: "https://app.example",
      "content-type": "application/json",
      authorization: "Bearer test",
    };
    const bad = await request(
      "/api/account",
      {
        method: "DELETE",
        headers,
        body: JSON.stringify({ confirmation: "DELETE", id: "other" }),
      },
      opts,
    );
    expect(bad.status).toBe(400);
    expect(deleted).toBe("");
    const good = await request(
      "/api/account",
      {
        method: "DELETE",
        headers,
        body: JSON.stringify({ confirmation: "DELETE" }),
      },
      opts,
    );
    expect(good.status).toBe(200);
    expect(deleted).toBe("owner");
  });
  it("health does not expose provider secrets", async () => {
    const r = await request("/api/health");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      status: "ok",
      aiConfigured: false,
      authConfigured: false,
    });
  });
  it("rejects cross-origin requests", async () => {
    const r = await request("/api/tutor", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
    });
    expect(r.status).toBe(403);
  });
  it("retires the tutor route without configured services", async () => {
    const r = await request("/api/tutor", {
      method: "POST",
      headers: {
        origin: "https://app.example",
        "content-type": "application/json",
      },
    });
    expect(r.status).toBe(410);
  });
  it("cannot re-enable the tutor with an old provider configuration", async () => {
    const r = await request(
      "/api/tutor",
      {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "content-type": "application/json",
        },
      },
      {
        env: {
          NODE_ENV: "test",
          APP_ORIGIN: "https://app.example",
          AI_MODEL: "test",
          AI_API_KEY: "test",
        },
        authenticate: async () => null,
      },
    );
    expect(r.status).toBe(410);
  });
  it("never contacts a paid model even with valid credentials and a valid request", async () => {
    let called = false;
    const r = await request(
      "/api/tutor",
      {
        method: "POST",
        headers: {
          origin: "https://app.example",
          "content-type": "application/json",
          authorization: "Bearer test",
        },
        body: JSON.stringify({
          question: "Explain",
          source: "function f(){return 1;}",
          file: "a.ts",
          line: 1,
          name: "f",
        }),
      },
      {
        env: {
          NODE_ENV: "test",
          APP_ORIGIN: "https://app.example",
          AI_MODEL: "test",
          AI_API_KEY: "test",
        },
        authenticate: async () => ({ id: "u1" }),
        fetcher: async () => {
          called = true;
          return Response.json({
            choices: [{ message: { content: "This returns one." } }],
          });
        },
      },
    );
    expect(r.status).toBe(410);
    expect(called).toBe(false);
  });
});
