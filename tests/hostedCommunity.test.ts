import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
// @ts-expect-error JavaScript gateway with injected provider boundaries.
import { createHostedHandler, hostedRoute } from "../server/hosted.mjs";
// @ts-expect-error JavaScript request adapter.
import { readJsonBody } from "../server/requestBody.mjs";
const pg = new PGlite();
const env = {
  NODE_ENV: "test",
  HOSTED_BACKEND_ENABLED: "true",
  APP_ORIGIN: "https://app.example",
  SUPABASE_URL: "https://fixture.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  SUPABASE_SECRET_KEY: "fixture-server-only",
  COMMUNITY_STORAGE_PATH: "must-never-open-this-local-file",
  LOCAL_ADMIN_TOKEN: "a".repeat(40),
  ALERTS_ENABLED: "true",
};
const feedback = {
  category: "feature",
  message: "Please add keyboard shortcut help.",
  rating: 5,
};
const hash = (id: string) => createHash("sha256").update(id).digest("hex");
// Executes real SQL as service_role, with provider transport replaced by this
// fixture. One PGlite connection cannot prove multi-connection locking.
const db = {
  async rpc(name: string, args: Record<string, unknown> = {}) {
    if (
      ![
        "gateway_backend_status",
        "gateway_admit_request",
        "community_write",
        "community_snapshot",
      ].includes(name)
    )
      return { error: Error("Unsupported fixture RPC") };
    if (!Object.keys(args).every((key) => /^p_[a-z_]+$/.test(key)))
      throw Error("Invalid argument");
    try {
      const result = await pg.query<{ value: any }>(
        `select public.${name}(${Object.keys(args)
          .map((key, i) => `${key} => $${i + 1}`)
          .join(",")}) as value`,
        Object.values(args),
      );
      return { data: result.rows[0].value, error: null };
    } catch (error) {
      return { error, data: null };
    }
  },
};
async function rpc(name: string, args = {}) {
  const result = await db.rpc(name, args);
  if (result.error) throw result.error;
  return result.data;
}
const write = (kind: string, key: string, value: unknown = {}) =>
  rpc("community_write", { p_kind: kind, p_key: key, p_value: value });
const snapshot = () => rpc("community_snapshot");
async function request(
  path: string,
  options: RequestInit = {},
  overrides = {},
) {
  const handler = createHostedHandler({
    env,
    db,
    authenticate: async () => ({ id: "owner" }),
    ...overrides,
  });
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw Error("No server");
    const result = await fetch(
      `http://127.0.0.1:${address.port}${path}`,
      options,
    );
    return { status: result.status, body: await result.json() };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    handler.close();
  }
}
const post = (body: unknown, id = randomUUID()): RequestInit => ({
  method: "POST",
  headers: {
    origin: env.APP_ORIGIN,
    "content-type": "application/json",
    "idempotency-key": id,
  },
  body: JSON.stringify(body),
});
beforeAll(async () => {
  await pg.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
  );
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/007_hosted_community.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await pg.exec(
    "reset role; truncate public.community_feedback, public.community_activity, public.gateway_limits; update public.community_control set collection_paused_until = null; set role service_role;",
  );
});
afterAll(async () => {
  await pg.close();
});

it("denies browser roles all community data/functions and keeps service writes behind bounded RPCs", async () => {
  for (const role of ["anon", "authenticated", "service_role"]) {
    await pg.exec(`reset role; set role ${role}`);
    for (const table of [
      "community_feedback",
      "community_activity",
      "community_control",
      "gateway_limits",
    ])
      await expect(pg.query(`select * from public.${table}`)).rejects.toThrow(
        "permission denied",
      );
    if (role !== "service_role") {
      for (const statement of [
        "select public.gateway_backend_status()",
        "select public.gateway_admit_request('feedback')",
        "select public.community_write('activity','x','{}')",
        "select public.community_snapshot()",
      ])
        await expect(pg.query(statement)).rejects.toThrow("permission denied");
    }
  }
  expect(await rpc("gateway_backend_status")).toBe(7);
  expect((await write("feedback", randomUUID(), feedback)).received).toBe(true);
});
it("persists submissions across handler instances and deduplicates the same request without leaking content", async () => {
  const key = randomUUID();
  expect(await request("/api/feedback", post(feedback, key))).toMatchObject({
    status: 201,
    body: { id: key },
  });
  expect(await request("/api/feedback", post(feedback, key))).toMatchObject({
    status: 201,
    body: { id: key },
  });
  const mismatch = await request(
    "/api/feedback",
    post({ ...feedback, message: "Changed message for this attempt." }, key),
  );
  expect(mismatch.status).toBe(409);
  expect(JSON.stringify(mismatch.body)).not.toContain(feedback.message);
  expect(await snapshot()).toMatchObject({
    feedbackCount: 1,
    ratingCount: 1,
    averageRating: 5,
  });
});
it("validates feedback fields at both HTTP and SQL boundaries", async () => {
  for (const value of [
    { ...feedback, source: "private source" },
    { ...feedback, message: "short" },
    { ...feedback, rating: 6 },
    { ...feedback, contact: "not-email" },
  ]) {
    expect((await request("/api/feedback", post(value))).status).toBe(400);
    await expect(write("feedback", randomUUID(), value)).rejects.toThrow(
      "Invalid feedback",
    );
  }
  const noKey = post(feedback);
  delete (noKey.headers as Record<string, string>)["idempotency-key"];
  expect((await request("/api/feedback", noKey)).status).toBe(400);
  expect(
    (await request("/api/feedback", post({ ...feedback, website: "spam" })))
      .status,
  ).toBe(400);
  expect((await snapshot()).feedbackCount).toBe(0);
});
it("shares fixed request budgets across instances and resets time windows without accumulating keys", async () => {
  for (let i = 0; i < 20; i++)
    expect(await rpc("gateway_admit_request", { p_scope: "account" })).toBe(
      true,
    );
  expect(await rpc("gateway_admit_request", { p_scope: "account" })).toBe(
    false,
  );
  const authenticate = vi.fn();
  expect(
    (
      await request(
        "/api/account",
        {
          ...post({ confirmation: "DELETE" }),
          method: "DELETE",
          headers: { ...post({}).headers, authorization: "Bearer test" },
        },
        { authenticate },
      )
    ).status,
  ).toBe(429);
  expect(authenticate).not.toHaveBeenCalled();
  await pg.exec(
    "reset role; update public.gateway_limits set hour_start = now()-interval '2 hours'; set role service_role;",
  );
  expect(await rpc("gateway_admit_request", { p_scope: "account" })).toBe(true);
  await expect(
    rpc("gateway_admit_request", { p_scope: "user-controlled-new-key" }),
  ).rejects.toThrow("Unsupported request scope");
  await pg.exec("reset role");
  expect(
    (await pg.query("select * from public.gateway_limits")).rows,
  ).toHaveLength(1);
});
it("enforces the feedback ceiling but allows a retry of an existing accepted submission", async () => {
  const key = randomUUID();
  await write("feedback", key, feedback);
  await pg.exec(
    `reset role; insert into public.community_feedback(id,payload) select gen_random_uuid(),'${JSON.stringify(feedback)}'::jsonb from generate_series(1,999); set role service_role;`,
  );
  expect((await write("feedback", randomUUID(), feedback)).status).toBe(503);
  expect((await write("feedback", key, feedback)).status).toBe(201);
  expect((await snapshot()).feedbackCount).toBe(1000);
});
it("removes activity on revocation and rejects delayed POSTs from a restarted handler", async () => {
  const installationId = randomUUID();
  expect(
    (await request("/api/activity", post({ installationId, event: "active" })))
      .status,
  ).toBe(202);
  expect(
    (await request("/api/activity", post({ installationId, event: "active" })))
      .status,
  ).toBe(202);
  expect((await snapshot()).retainedOptInInstallations).toBe(1);
  expect(
    (
      await request("/api/activity", {
        ...post({ installationId }),
        method: "DELETE",
      })
    ).status,
  ).toBe(200);
  expect(
    (await request("/api/activity", post({ installationId, event: "active" })))
      .status,
  ).toBe(409);
  expect((await snapshot()).retainedOptInInstallations).toBe(0);
  await pg.exec("reset role");
  const rows = (await pg.query("select * from public.community_activity")).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    id: hash(installationId),
    first_seen: null,
    last_seen: null,
  });
  expect(JSON.stringify(rows)).not.toContain(installationId);
});
it("does not let collection limits prevent consent revocation", async () => {
  const key = hash(randomUUID());
  await write("activity", key);
  await pg.exec(
    "reset role; update public.gateway_limits set hour_count = 500,day_count = 5000 where scope = 'activity'; set role service_role;",
  );
  expect((await write("activity", hash(randomUUID()))).status).toBe(429);
  expect((await write("revoke", key)).status).toBe(200);
  expect((await write("activity", key)).status).toBe(409);
});
it("pauses collection rather than losing revocations when the marker pool is full", async () => {
  await pg.exec(
    "reset role; insert into public.community_activity(id,revoked_until) select lpad(to_hex(n),64,'0'),now()+interval '30 days' from generate_series(1,10000) n; set role service_role;",
  );
  expect((await write("revoke", hash(randomUUID()))).status).toBe(200);
  expect((await write("activity", hash(randomUUID()))).status).toBe(409);
  await pg.exec("reset role");
  expect(
    (
      await pg.query<{ count: number }>(
        "select count(*)::int as count from public.community_activity",
      )
    ).rows[0].count,
  ).toBe(10000);
});
it("cleans expired data without a scheduler and returns at most 100 feedback entries", async () => {
  await write("feedback", randomUUID(), feedback);
  await write("activity", hash(randomUUID()));
  await write("revoke", hash(randomUUID()));
  await pg.exec(
    "reset role; update public.community_feedback set at = now()-interval '91 days'; update public.community_activity set first_seen = current_date-40,last_seen = current_date-31 where revoked_until is null; update public.community_activity set revoked_until = now()-interval '1 day' where revoked_until is not null; set role service_role;",
  );
  expect(await snapshot()).toMatchObject({
    feedbackCount: 0,
    retainedOptInInstallations: 0,
    feedback: [],
  });
  await pg.exec(
    `reset role; insert into public.community_feedback(id,payload) select gen_random_uuid(),'${JSON.stringify(feedback)}'::jsonb from generate_series(1,101); set role service_role;`,
  );
  expect((await snapshot()).feedback).toHaveLength(100);
});
it("keeps optional hosted services disabled without explicit complete configuration", async () => {
  const blockedDb = {
    rpc: vi.fn(() => {
      throw Error("must not query");
    }),
  };
  for (const config of [
    { ...env, HOSTED_BACKEND_ENABLED: "false" },
    { ...env, SUPABASE_SECRET_KEY: "" },
    { ...env, APP_ORIGIN: "http://app.example" },
  ]) {
    expect(
      (
        await request(
          "/api/community/status",
          {},
          { env: config, db: blockedDb },
        )
      ).body.feedbackEnabled,
    ).toBe(false);
    expect(
      (await request("/api/health", {}, { env: config, db: blockedDb })).body
        .accountDeletionConfigured,
    ).toBe(false);
    expect(
      (
        await request(
          "/api/local-admin",
          {
            headers: {
              origin: env.APP_ORIGIN,
              authorization: `Bearer ${env.LOCAL_ADMIN_TOKEN}`,
            },
          },
          { env: config, db: blockedDb },
        )
      ).status,
    ).toBe(404);
  }
  expect(blockedDb.rpc).not.toHaveBeenCalled();
});
it("fails closed when the database or required migration is unavailable", async () => {
  const unavailable = {
    rpc: async () => ({ error: Error("private database diagnostic") }),
  };
  const overrides = { db: unavailable };
  expect(
    (await request("/api/community/status", {}, overrides)).body
      .feedbackEnabled,
  ).toBe(false);
  expect(
    (await request("/api/health", {}, overrides)).body
      .accountDeletionConfigured,
  ).toBe(false);
  const response = await request("/api/feedback", post(feedback), overrides);
  expect(response.status).toBe(503);
  expect(JSON.stringify(response.body)).not.toContain("diagnostic");
});
it("requires exact origin, method, verified administrator and MFA", async () => {
  expect(
    (
      await request("/api/feedback", {
        ...post(feedback),
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
      })
    ).status,
  ).toBe(403);
  expect((await request("/api/feedback", { method: "GET" })).status).toBe(405);
  expect((await request("/api/unknown")).status).toBe(404);
  const token = `x.${Buffer.from('{"aal":"aal2"}').toString("base64url")}.x`;
  const options = { headers: { authorization: `Bearer ${token}` } };
  expect((await request("/api/admin", options)).status).toBe(403);
  const response = await request("/api/admin", options, {
    authenticate: async () => ({
      id: "owner",
      app_metadata: { role: "admin" },
    }),
  });
  expect(response).toMatchObject({
    status: 200,
    body: {
      metricsScope: "function-instance",
      community: { feedbackCount: 0 },
    },
  });
});
it("deletes only the authenticated account through the hosted handler", async () => {
  const deleted: string[] = [];
  const options = {
    authenticate: async () => ({ id: "owner" }),
    deleteAccount: async (id: string) => {
      deleted.push(id);
    },
  };
  const init = {
    ...post({ confirmation: "DELETE", id: "other" }),
    method: "DELETE",
    headers: { ...post({}).headers, authorization: "Bearer test" },
  };
  expect((await request("/api/account", init, options)).status).toBe(400);
  expect(deleted).toEqual([]);
  expect(
    (
      await request(
        "/api/account",
        { ...init, body: '{"confirmation":"DELETE"}' },
        options,
      )
    ).status,
  ).toBe(200);
  expect(deleted).toEqual(["owner"]);
});
it("handles parsed Vercel bodies and split UTF-8 bytes while enforcing byte limits", async () => {
  const value = { message: "你好世界" };
  expect(await readJsonBody({ body: value }, 100)).toEqual(value);
  const bytes = Buffer.from(JSON.stringify(value));
  async function* chunks() {
    for (const byte of bytes) yield Buffer.from([byte]);
  }
  expect(await readJsonBody(chunks(), 100)).toEqual(value);
  await expect(readJsonBody({ body: value }, 10)).rejects.toThrow(
    "Request too large",
  );
  await expect(readJsonBody(chunks(), 10)).rejects.toThrow("Request too large");
  expect(
    hostedRoute({
      url: "/api/index?route=github/callback&code=fixture&state=fixture",
    }),
  ).toBe("/api/github/callback?code=fixture&state=fixture");
  expect(hostedRoute({ url: "/api/index", query: { route: "../admin" } })).toBe(
    "/api/invalid-route",
  );
});
