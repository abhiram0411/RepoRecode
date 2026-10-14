import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
const pg = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
const projectA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  projectB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function asUser(id: string) {
  await pg.exec("reset role; set role authenticated");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
beforeAll(async () => {
  // Supabase supplies auth.users/auth.uid and these roles. This local fixture
  // models verified identity only; it does not test OAuth or hosted JWT validation.
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;`);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory))
    .filter((n) => /^\d+.*\.sql$/.test(n))
    .sort())
    await pg.exec(await readFile(new URL(name, directory), "utf8"));
}, 30000);
beforeEach(async () => {
  await pg.exec("reset role; truncate auth.users cascade");
  await pg.query(
    "insert into auth.users(id,last_sign_in_at) values($1,now()),($2,now())",
    [alice, bob],
  );
  await pg.query(
    "insert into public.projects(id,owner_id,payload) values($1,$2,'{}'),($3,$4,'{}')",
    [projectA, alice, projectB, bob],
  );
  await pg.query(
    "insert into public.preferences(owner_id,payload) values($1,'{}'),($2,'{}')",
    [alice, bob],
  );
});
afterAll(async () => {
  await pg.close();
});
describe("complete database migrations and local role isolation", () => {
  it.each([alice, bob])(
    "only exposes and modifies the signed-in owner's rows (%s)",
    async (owner) => {
      await asUser(owner);
      for (const table of ["projects", "preferences"]) {
        expect(
          (
            await pg.query<{ owner_id: string }>(
              `select owner_id from public.${table}`,
            )
          ).rows,
        ).toEqual([{ owner_id: owner }]);
        const foreign = owner === alice ? bob : alice;
        expect(
          (
            await pg.query(
              `update public.${table} set payload='{"private":true}' where owner_id=$1 returning owner_id`,
              [foreign],
            )
          ).rows,
        ).toHaveLength(0);
        expect(
          (
            await pg.query(
              `delete from public.${table} where owner_id=$1 returning owner_id`,
              [foreign],
            )
          ).rows,
        ).toHaveLength(0);
        expect(
          (
            await pg.query(
              `update public.${table} set payload='{"mine":true}' where owner_id=$1 returning owner_id`,
              [owner],
            )
          ).rows,
        ).toHaveLength(1);
        await expect(
          pg.query(`update public.${table} set owner_id=$1 where owner_id=$2`, [
            foreign,
            owner,
          ]),
        ).rejects.toThrow();
      }
    },
  );
  it("rejects another owner's inserts and anonymous data access", async () => {
    await asUser(alice);
    await expect(
      pg.query(
        "insert into public.projects(id,owner_id,payload) values(gen_random_uuid(),$1,'{}')",
        [bob],
      ),
    ).rejects.toThrow("row-level security");
    await pg.exec("reset role; set role anon");
    for (const table of [
      "projects",
      "preferences",
      "github_connections",
      "github_oauth_pending",
      "ai_usage",
      "tutor_daily_quotas",
    ])
      await expect(pg.query(`select * from public.${table}`)).rejects.toThrow(
        "permission denied",
      );
  });
  it("enforces stored-payload size limits", async () => {
    await asUser(alice);
    await expect(
      pg.query(
        "update public.preferences set payload=$1::jsonb where owner_id=$2",
        [JSON.stringify({ data: "x".repeat(160001) }), alice],
      ),
    ).rejects.toThrow("check constraint");
    await expect(
      pg.query(
        "update public.projects set payload=$1::jsonb where owner_id=$2",
        [JSON.stringify({ data: "x".repeat(6000001) }), alice],
      ),
    ).rejects.toThrow("check constraint");
  });
  it("reserves measured administration for service role", async () => {
    await asUser(alice);
    await expect(pg.query("select public.admin_snapshot()")).rejects.toThrow(
      "permission denied",
    );
    await pg.exec("reset role; set role service_role");
    const result = await pg.query<{
      data: { totalUsers: number; storedProjects: number };
    }>("select public.admin_snapshot() as data");
    expect(result.rows[0].data).toMatchObject({
      totalUsers: 2,
      storedProjects: 2,
    });
  });
  it("deleting an account removes its projects, preferences and GitHub credentials/state", async () => {
    await pg.query(
      "insert into public.github_connections(owner_id,login,encrypted_token) values($1,'test','encrypted')",
      [alice],
    );
    await pg.query(
      "insert into public.github_oauth_pending(owner_id,state_hash,encrypted_pending,expires_at) values($1,$2,'encrypted',now()+interval '10 minutes')",
      [alice, "a".repeat(64)],
    );
    await pg.query("delete from auth.users where id=$1", [alice]);
    for (const table of [
      "projects",
      "preferences",
      "github_connections",
      "github_oauth_pending",
    ])
      expect(
        (
          await pg.query(`select * from public.${table} where owner_id=$1`, [
            alice,
          ])
        ).rows,
      ).toHaveLength(0);
    expect(
      (await pg.query("select * from public.projects where owner_id=$1", [bob]))
        .rows,
    ).toHaveLength(1);
  });
});
