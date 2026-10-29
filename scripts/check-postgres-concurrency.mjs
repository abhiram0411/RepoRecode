// Docker PostgreSQL acceptance. Uses only synthetic data in a disposable,
// network-isolated container. No hosted credentials or host database required.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const container = `reporecode-concurrency-${randomUUID()}`;
const image = "postgres:17-alpine";
const options = {
  env: process.env,
  windowsHide: true,
  timeout: 30000,
  maxBuffer: 2 * 1024 * 1024,
};
const docker = async (args, overrides = {}) =>
  (await run("docker", args, { ...options, ...overrides })).stdout.trim();
const sql = (statement, extraEnv = {}) =>
  docker([
    "exec",
    "-e",
    `PGAPPNAME=${extraEnv.PGAPPNAME || "reporecode-concurrency"}`,
    container,
    "psql",
    "-h",
    "/var/run/postgresql",
    "-U",
    "reporecode_test",
    "-d",
    "postgres",
    "-X",
    "-q",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    statement,
  ]);
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const pids = new Set();
async function query(expression, role = "service_role") {
  assert.ok(
    ["service_role", "reporecode_test", "authenticated"].includes(role),
  );
  const value = JSON.parse(
    await sql(
      `set role ${role}; select json_build_object('pid',pg_backend_pid(),'value',(${expression}));`,
    ),
  );
  pids.add(value.pid);
  return value.value;
}
const receipt = {
  date: new Date().toISOString(),
  scope:
    "Disposable Docker PostgreSQL; independent client connections; synthetic identities and tokens only",
  version: null,
  checks: [],
  serverStopped: false,
  containerRemoved: false,
  container,
  image,
  network: "none",
  storage: "temporary in-memory filesystem",
  limitations: [
    "Does not prove hosted Supabase configuration, real OAuth, live cross-account identity or provider token rotation",
  ],
};
async function check(name, fn) {
  const started = Date.now();
  await fn();
  receipt.checks.push({ name, passed: true, durationMs: Date.now() - started });
  console.log(`PASS ${name}`);
}
const owner = "11111111-1111-4111-8111-111111111111";
const stateHash = "a".repeat(64);
const rpc = (name, args) => `public.${name}(${args.map(quote).join(",")})`;
let failed;
try {
  receipt.dockerVersion = await docker([
    "version",
    "--format",
    "{{.Server.Version}}",
  ]);
  await docker(["pull", image], { timeout: 300000 });
  receipt.imageDigest = await docker([
    "image",
    "inspect",
    image,
    "--format",
    "{{index .RepoDigests 0}}",
  ]);
  await docker(
    [
      "run",
      "--detach",
      "--name",
      container,
      "--network",
      "none",
      "--memory",
      "512m",
      "--cpus",
      "2",
      "--pids-limit",
      "160",
      "--tmpfs",
      "/var/lib/postgresql/data:rw,nosuid,noexec,size=256m",
      "-e",
      "POSTGRES_USER=reporecode_test",
      "-e",
      "POSTGRES_DB=postgres",
      "-e",
      "POSTGRES_PASSWORD",
      image,
      "postgres",
      "-c",
      "listen_addresses=",
      "-c",
      "max_connections=40",
      "-c",
      "shared_buffers=32MB",
    ],
    {
      env: {
        ...process.env,
        POSTGRES_PASSWORD: randomBytes(32).toString("base64url"),
      },
    },
  );
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      // TCP-disabled final server is PID 1; skip the entrypoint's temporary server.
      await docker([
        "exec",
        container,
        "sh",
        "-c",
        'test "$(cat /proc/1/comm)" = postgres && pg_isready -h /var/run/postgresql -U reporecode_test -d postgres',
      ]);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  assert.ok(ready, "Docker PostgreSQL did not become ready");
  receipt.version = await docker(["exec", container, "postgres", "--version"]);
  await sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;`);
  const migrations = path.join(root, "supabase", "migrations");
  for (const name of (await readdir(migrations))
    .filter((n) => /^\d+.*\.sql$/.test(n))
    .sort()) {
    await sql(await readFile(path.join(migrations, name), "utf8"));
  }
  await sql(`insert into auth.users values(${quote(owner)},now());`);
  await check("all migrations and server role readiness", async () =>
    assert.equal(await query("public.gateway_backend_status()"), 7),
  );

  await check("24 connections admit exactly 20 account requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 24 }, () =>
        query("public.gateway_admit_request('account')"),
      ),
    );
    assert.equal(results.filter(Boolean).length, 20);
    assert.equal(
      await query(
        "select hour_count from public.gateway_limits where scope='account'",
        "reporecode_test",
      ),
      20,
    );
    assert.equal(
      await query(
        "select day_count from public.gateway_limits where scope='account'",
        "reporecode_test",
      ),
      20,
    );
  });

  const feedbackId = randomUUID();
  const payload = JSON.stringify({
    category: "general",
    message: "Disposable local concurrency feedback",
  });
  await check(
    "concurrent identical feedback retries keep one row and one admission",
    async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          query(rpc("community_write", ["feedback", feedbackId, payload])),
        ),
      );
      assert.ok(results.every((r) => r.status === 201 && r.id === feedbackId));
      assert.equal(
        await query(
          "select count(*) from public.community_feedback",
          "reporecode_test",
        ),
        1,
      );
      assert.equal(
        await query(
          "select hour_count from public.gateway_limits where scope='feedback'",
          "reporecode_test",
        ),
        1,
      );
      const changed = await Promise.all(
        Array.from({ length: 4 }, () =>
          query(
            rpc("community_write", [
              "feedback",
              feedbackId,
              JSON.stringify({
                category: "general",
                message: "Different disposable feedback content",
              }),
            ]),
          ),
        ),
      );
      assert.ok(changed.every((r) => r.status === 409));
    },
  );

  await check(
    "concurrent activity and revocation never restore consent",
    async () => {
      const key = "b".repeat(64);
      const results = await Promise.all([
        ...Array.from({ length: 8 }, () =>
          query(rpc("community_write", ["activity", key, "{}"])),
        ),
        query(rpc("community_write", ["revoke", key, "{}"])),
      ]);
      assert.ok(
        results.slice(0, 8).every((r) => [202, 409].includes(r.status)),
      );
      assert.equal(results.at(-1).status, 200);
      assert.equal(
        (await query(rpc("community_write", ["activity", key, "{}"]))).status,
        409,
      );
      assert.equal(
        await query(
          `select revoked_until>now() and first_seen is null and last_seen is null from public.community_activity where id=${quote(key)}`,
          "reporecode_test",
        ),
        true,
      );
    },
  );

  await check(
    "one-use GitHub state is consumed by exactly one connection",
    async () => {
      await query(
        rpc("github_begin_connection", [owner, stateHash, "synthetic-pending"]),
      );
      const values = await Promise.all(
        Array.from({ length: 12 }, () =>
          query(rpc("github_consume_state", [stateHash])),
        ),
      );
      assert.equal(values.filter((v) => v === "synthetic-pending").length, 1);
      assert.equal(values.filter((v) => v === null).length, 11);
      assert.equal(
        await query(
          rpc("github_complete_connection", [
            owner,
            stateHash,
            "synthetic-token",
            "fixture",
          ]),
        ),
        true,
      );
    },
  );

  await check(
    "refresh lease has one winner and rejects stale completion",
    async () => {
      const leases = Array.from({ length: 12 }, () => randomUUID());
      const claims = await Promise.all(
        leases.map((lease) =>
          query(rpc("github_claim_refresh", [owner, "synthetic-token", lease])),
        ),
      );
      assert.equal(claims.filter(Boolean).length, 1);
      const winner = leases[claims.indexOf(true)];
      const loser = leases[claims.indexOf(false)];
      assert.equal(
        await query(
          rpc("github_finish_refresh", [
            owner,
            "synthetic-token",
            loser,
            "bad-token",
          ]),
        ),
        false,
      );
      assert.equal(
        await query(
          rpc("github_finish_refresh", [
            owner,
            "synthetic-token",
            winner,
            "synthetic-rotated",
          ]),
        ),
        true,
      );
      assert.equal(
        await query(
          rpc("github_finish_refresh", [
            owner,
            "synthetic-token",
            winner,
            "bad-repeat",
          ]),
        ),
        false,
      );
    },
  );

  await check(
    "disconnect racing refresh completion leaves no credential",
    async () => {
      const lease = randomUUID();
      assert.equal(
        await query(
          rpc("github_claim_refresh", [owner, "synthetic-rotated", lease]),
        ),
        true,
      );
      await Promise.all([
        query(
          rpc("github_finish_refresh", [
            owner,
            "synthetic-rotated",
            lease,
            "late-token",
          ]),
        ),
        query(rpc("github_disconnect", [owner])),
      ]);
      assert.equal(
        await query(
          "select count(*) from public.github_connections",
          "reporecode_test",
        ),
        0,
      );
      assert.equal(
        await query(
          "select count(*) from public.github_oauth_pending",
          "reporecode_test",
        ),
        0,
      );
    },
  );

  await check(
    "concurrent feedback inserts cannot exceed the 1000-row cap",
    async () => {
      await sql(
        `insert into public.community_feedback(id,payload) select gen_random_uuid(),${quote(payload)}::jsonb from generate_series(1,998);`,
      );
      const values = await Promise.all(
        Array.from({ length: 8 }, () =>
          query(rpc("community_write", ["feedback", randomUUID(), payload])),
        ),
      );
      assert.equal(values.filter((v) => v.status === 201).length, 1);
      assert.equal(values.filter((v) => v.status === 503).length, 7);
      assert.equal(
        await query(
          "select count(*) from public.community_feedback",
          "reporecode_test",
        ),
        1000,
      );
    },
  );

  await check(
    "concurrent activity inserts respect the shared 10000-row cap",
    async () => {
      await sql(
        "insert into public.community_activity(id,revoked_until) select repeat(md5(g::text),2),now()+interval '30 days' from generate_series(1,9998) as g;",
      );
      const values = await Promise.all(
        Array.from({ length: 8 }, () =>
          query(
            rpc("community_write", [
              "activity",
              randomBytes(32).toString("hex"),
              "{}",
            ]),
          ),
        ),
      );
      assert.equal(values.filter((v) => v.status === 202).length, 1);
      assert.equal(values.filter((v) => v.status === 503).length, 7);
      assert.equal(
        await query(
          "select count(*) from public.community_activity",
          "reporecode_test",
        ),
        10000,
      );
    },
  );

  await check(
    "blocked admission times out without consuming a request",
    async () => {
      const holder = sql(
        "begin; select id from public.community_control where id=true for update; select pg_sleep(5); commit;",
        { PGAPPNAME: "reporecode-lock-holder" },
      );
      // Observe the server's sleep barrier: the control-row lock is already held.
      try {
        let ready = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          ready = await query(
            "select exists(select 1 from pg_stat_activity where application_name='reporecode-lock-holder' and wait_event='PgSleep')",
            "reporecode_test",
          );
          if (ready) break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.ok(ready, "Lock holder never reached the barrier");
        await assert.rejects(
          query("public.gateway_admit_request('admin')"),
          /lock timeout/,
        );
      } finally {
        await holder;
      }
      assert.equal(
        await query(
          "select count(*) from public.gateway_limits where scope='admin'",
          "reporecode_test",
        ),
        0,
      );
    },
  );
  receipt.status = "passed";
} catch (error) {
  failed = error;
  receipt.status = "failed";
  receipt.error = String(error.message);
} finally {
  try {
    // Remove only this run's random container; no host mounts or named volumes.
    const existing = await docker([
      "container",
      "ls",
      "-a",
      "--filter",
      `name=^/${container}$`,
      "--format",
      "{{.Names}}",
    ]);
    if (existing === container)
      await docker(["rm", "--force", "--volumes", container]);
    assert.equal(
      await docker([
        "container",
        "ls",
        "-a",
        "--filter",
        `name=^/${container}$`,
        "--format",
        "{{.Names}}",
      ]),
      "",
    );
    receipt.serverStopped = true;
    receipt.containerRemoved = true;
  } catch (error) {
    receipt.shutdownError = String(error.message);
    receipt.status = "failed";
    failed ??= error;
  }
  receipt.independentBackendPids = pids.size;
  receipt.syntheticDataRemoved = receipt.containerRemoved;
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await writeFile(
    path.join(root, "artifacts", "docker-postgres-concurrency-results.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
}
if (failed) throw failed;
console.log(
  `${receipt.checks.length} Docker PostgreSQL checks passed across ${pids.size} backend processes; container and test data removed.`,
);
