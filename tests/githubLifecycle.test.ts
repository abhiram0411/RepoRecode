import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
// @ts-expect-error JavaScript gateway boundary.
import { createGithubIntegration, seal, unseal } from "../server/github.mjs";
// @ts-expect-error JavaScript gateway boundary.
import { createGithubStore } from "../server/githubStore.mjs";

const owner = "11111111-1111-4111-8111-111111111111";
const key = Buffer.alloc(32, 7).toString("base64");
const env = {
  GITHUB_TOKEN_ENCRYPTION_KEY: key,
  GITHUB_APP_CLIENT_ID: "test-client",
  GITHUB_APP_CLIENT_SECRET: "test-secret",
  APP_ORIGIN: "https://app.example",
  GITHUB_CALLBACK_URL: "https://app.example/api/github/callback",
};
const pg = new PGlite();
// Adapt the real store's Supabase calls to real local PostgreSQL. Network behavior
// is stubbed; SQL, roles, constraints and compare-and-swap predicates are executed.
const db = createGithubStore({
  async rpc(name: string, args: Record<string, unknown>) {
    if (
      !/^github_[a-z_]+$/.test(name) ||
      !Object.keys(args).every((k) => /^p_[a-z_]+$/.test(k))
    )
      throw Error("Invalid test RPC");
    const placeholders = Object.keys(args)
      .map((k, i) => `${k} => $${i + 1}`)
      .join(",");
    try {
      const result = await pg.query<{ value: unknown }>(
        `select public.${name}(${placeholders}) as value`,
        Object.values(args),
      );
      return { data: result.rows[0].value, error: null };
    } catch (error) {
      return { error };
    }
  },
  from(table: string) {
    expect(table).toBe("github_connections");
    return {
      select(column: string) {
        expect(column).toBe("encrypted_token");
        return {
          eq(field: string, value: string) {
            expect(field).toBe("owner_id");
            return {
              async maybeSingle() {
                const result = await pg.query(
                  "select encrypted_token from public.github_connections where owner_id=$1",
                  [value],
                );
                return { data: result.rows[0], error: null };
              },
            };
          },
        };
      },
    };
  },
});
const tokens = (suffix = "1") => ({
  access_token: "access-" + suffix,
  expires_in: 28800,
  refresh_token: "refresh-" + suffix,
  refresh_token_expires_in: 15897600,
});
function fixture(onExchange = async () => Response.json(tokens())) {
  const calls: { url: string; options: RequestInit }[] = [];
  const fetcher = vi.fn(async (url: string, options: RequestInit) => {
    calls.push({ url, options });
    if (url.endsWith("/access_token")) return onExchange();
    if (url.endsWith("/user")) return Response.json({ login: "test-owner" });
    if (url.includes("/user/installations"))
      return Response.json({ installations: [] });
    throw Error("Unexpected request");
  });
  return { app: createGithubIntegration({ env, db, fetcher }), calls, fetcher };
}
async function stateFor(app: ReturnType<typeof fixture>["app"]) {
  return new URL(await app.connect(owner)).searchParams.get("state")!;
}
async function expiring(refreshExpiresAt = Date.now() + 86400000) {
  const encrypted = seal(
    {
      token: "old-access",
      expiresAt: Date.now() - 1,
      refreshToken: "old-refresh",
      refreshExpiresAt,
    },
    key,
  );
  await pg.query(
    "insert into public.github_connections(owner_id,login,encrypted_token) values($1,'test-owner',$2)",
    [owner, encrypted],
  );
  return encrypted;
}
function gate() {
  let start!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    started,
    release,
    exchange: async () => {
      start();
      await waiting;
      return Response.json(tokens("rotated"));
    },
  };
}
beforeAll(async () => {
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    grant usage on schema public to anon,authenticated,service_role;
    insert into auth.users values('${owner}');`);
  for (const name of ["002_github_connections.sql", "006_github_lifecycle.sql"])
    await pg.exec(
      await readFile(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
  await pg.exec("set role service_role");
}, 30000);
beforeEach(async () => {
  await pg.exec(
    "reset role; truncate public.github_oauth_pending,public.github_connections; set role service_role",
  );
});
afterAll(async () => {
  await pg.close();
});

describe("GitHub lifecycle with local PostgreSQL", () => {
  it("completes state on a second process, encrypts credentials and consumes PKCE once", async () => {
    const first = fixture(),
      second = fixture();
    const url = new URL(await first.app.connect(owner)),
      state = url.searchParams.get("state")!;
    const rows = await pg.query<{
      state_hash: string;
      encrypted_pending: string;
    }>("select * from public.github_oauth_pending");
    expect(rows.rows[0].state_hash).toBe(
      createHash("sha256").update(state).digest("hex"),
    );
    expect(rows.rows[0].encrypted_pending).not.toContain(owner);
    expect(await second.app.callback("code", state)).toBe(
      env.APP_ORIGIN + "/?github=connected",
    );
    const body = JSON.parse(second.calls[0].options.body as string);
    expect(
      createHash("sha256").update(body.code_verifier).digest("base64url"),
    ).toBe(url.searchParams.get("code_challenge"));
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const encrypted = await db.get(owner);
    expect(encrypted).not.toContain("access-1");
    expect(unseal(encrypted, key)).toMatchObject({
      token: "access-1",
      refreshToken: "refresh-1",
    });
    await expect(first.app.callback("code", state)).rejects.toThrow("state");
    expect(first.fetcher).not.toHaveBeenCalled();
  });
  it("rejects expired, malformed and superseded states before sending credentials", async () => {
    const { app, fetcher } = fixture();
    const old = await stateFor(app),
      current = await stateFor(app);
    await expect(app.callback("code", old)).rejects.toThrow("state");
    await expect(app.callback("code", "invalid")).rejects.toThrow("state");
    await pg.exec(
      "update public.github_oauth_pending set expires_at=now()-interval '1 second'",
    );
    await expect(app.callback("code", current)).rejects.toThrow("state");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("disconnect invalidates pending state", async () => {
    const { app, fetcher } = fixture();
    const state = await stateFor(app);
    await app.disconnect(owner);
    await expect(app.callback("code", state)).rejects.toThrow("state");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["disconnect", "new connection"])(
    "an in-flight callback cannot undo %s",
    async (action) => {
      const hold = gate(),
        { app } = fixture(hold.exchange);
      const state = await stateFor(app);
      const callback = app.callback("code", state);
      const rejected = expect(callback).rejects.toThrow("changed");
      await hold.started;
      if (action === "disconnect") await app.disconnect(owner);
      else await stateFor(app);
      hold.release();
      await rejected;
      expect(await db.get(owner)).toBeUndefined();
    },
  );
  it("rotates both encrypted tokens before repository access", async () => {
    await expiring();
    const { app, calls } = fixture(async () => Response.json(tokens("2")));
    expect(await app.repositories(owner)).toEqual([]);
    expect(JSON.parse(calls[0].options.body as string)).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "old-refresh",
    });
    expect(calls[1].options.headers).toMatchObject({
      Authorization: "Bearer access-2",
    });
    expect(unseal(await db.get(owner), key)).toMatchObject({
      token: "access-2",
      refreshToken: "refresh-2",
    });
  });
  it("shares one refresh between independent integration instances", async () => {
    await expiring();
    const hold = gate(),
      first = fixture(hold.exchange),
      second = fixture();
    const a = first.app.repositories(owner);
    await hold.started;
    const b = second.app.repositories(owner);
    hold.release();
    await Promise.all([a, b]);
    expect(
      [...first.calls, ...second.calls].filter((c) =>
        c.url.endsWith("/access_token"),
      ),
    ).toHaveLength(1);
  });
  it.each(["disconnect", "reconnect"])(
    "a rotating token cannot overwrite %s",
    async (action) => {
      await expiring();
      const hold = gate(),
        { app } = fixture(hold.exchange);
      const result = app.repositories(owner),
        rejected = expect(result).rejects.toThrow("changed");
      await hold.started;
      if (action === "disconnect") await app.disconnect(owner);
      else {
        const replacement = fixture(async () =>
          Response.json(tokens("new-account")),
        );
        await replacement.app.callback("code", await stateFor(replacement.app));
      }
      hold.release();
      await rejected;
      const current = await db.get(owner);
      if (action === "disconnect") expect(current).toBeUndefined();
      else expect(unseal(current, key).token).toBe("access-new-account");
    },
  );
  it("rejects expired refresh grants without network calls", async () => {
    await expiring(Date.now() - 1);
    const { app, fetcher } = fixture();
    await expect(app.repositories(owner)).rejects.toThrow("Reconnect");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { error: "bad_refresh_token", error_description: "secret-provider-detail" },
    { ...tokens(), expires_in: "28800" },
    { ...tokens(), access_token: "x".repeat(17000) },
    { access_token: "new", expires_in: 28800 },
  ])(
    "fails closed on denied or malformed refresh responses (%#)",
    async (response) => {
      const previous = await expiring();
      const { app, calls } = fixture(async () => Response.json(response));
      await expect(app.repositories(owner)).rejects.toThrow("Reconnect");
      expect(calls).toHaveLength(1);
      expect(await db.get(owner)).toBe(previous);
      const lease = await pg.query<{ refresh_lease: string | null }>(
        "select refresh_lease from public.github_connections",
      );
      expect(lease.rows[0].refresh_lease).toBeNull();
    },
  );
  it("preserves non-expiring grants and asks legacy expired grants to reconnect", async () => {
    const { app, calls } = fixture(async () =>
      Response.json({ access_token: "non-expiring" }),
    );
    await app.callback("code", await stateFor(app));
    await app.repositories(owner);
    expect(calls.filter((c) => c.url.endsWith("/access_token"))).toHaveLength(
      1,
    );
    await pg.query("update public.github_connections set encrypted_token=$1", [
      seal({ token: "legacy", expiresAt: 1 }, key),
    ]);
    await expect(app.repositories(owner)).rejects.toThrow("Reconnect");
    expect(calls.filter((c) => c.url.endsWith("/access_token"))).toHaveLength(
      1,
    );
  });
  it("lease expiry and comparison reject stale writes without recreating rows", async () => {
    const previous = await expiring(),
      a = randomUUID(),
      b = randomUUID();
    expect(await db.claim(owner, previous, a)).toBe(true);
    expect(await db.claim(owner, previous, b)).toBe(false);
    await pg.exec(
      "update public.github_connections set refresh_until=now()-interval '1 second'",
    );
    expect(await db.finish(owner, previous, a, "stale")).toBe(false);
    expect(await db.claim(owner, previous, b)).toBe(true);
    await db.release(owner, previous, a);
    expect(await db.finish(owner, previous, b, "new-encrypted")).toBe(true);
    expect(await db.finish(owner, previous, a, "stale")).toBe(false);
    expect(await db.get(owner)).toBe("new-encrypted");
  });
  it("stops waiting for a crashed refresh holder after a bounded number of attempts", async () => {
    const previous = await expiring();
    await db.claim(owner, previous, randomUUID());
    const fetcher = vi.fn(),
      wait = vi.fn(async () => {});
    const app = createGithubIntegration({ env, db, fetcher, wait });
    await expect(app.repositories(owner)).rejects.toThrow("updating");
    expect(wait).toHaveBeenCalledTimes(20);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("browser roles cannot read credentials or invoke any lifecycle function", async () => {
    const functions = await pg.query<{ signature: string }>(
      `select p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname like 'github_%'`,
    );
    expect(functions.rows).toHaveLength(7);
    for (const role of ["anon", "authenticated"]) {
      for (const { signature } of functions.rows) {
        const result = await pg.query<{ allowed: boolean }>(
          "select has_function_privilege($1,$2,'EXECUTE') as allowed",
          [role, signature],
        );
        expect(result.rows[0].allowed).toBe(false);
      }
      await pg.exec("reset role; set role " + role);
      try {
        await expect(
          pg.query("select * from public.github_connections"),
        ).rejects.toThrow("permission denied");
        await expect(
          pg.query("select * from public.github_oauth_pending"),
        ).rejects.toThrow("permission denied");
        await expect(
          pg.query("select public.github_disconnect($1)", [owner]),
        ).rejects.toThrow("permission denied");
      } finally {
        await pg.exec("reset role; set role service_role");
      }
    }
  });
});
