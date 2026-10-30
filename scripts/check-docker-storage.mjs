// Disposable local volume acceptance. Never mounts host directories or uses cloud credentials.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const id = randomUUID();
const container = `reporecode-storage-check-${id}`;
const volume = `reporecode-storage-check-${id}`;
const image = "reporecode-gateway:local-check";
const origin = "http://reporecode-volume.test";
const token = randomBytes(32).toString("hex");
const env = { ...process.env, LOCAL_ADMIN_TOKEN: token };
const receipt = {
  date: new Date().toISOString(),
  scope:
    "Synthetic local gateway volume; no host mounts, published ports, external network or cloud services",
  checks: [],
  limitations: [
    "Does not verify a deployed HTTPS proxy, provider accounts, backup recovery or multiple writers",
  ],
};
const docker = async (args, timeout = 30000) =>
  (
    await run("docker", args, {
      cwd: root,
      windowsHide: true,
      timeout,
      maxBuffer: 1024 * 1024,
      env,
    })
  ).stdout.trim();
const execute = (code) =>
  docker(["exec", container, "node", "--input-type=module", "-e", code]);
async function request(
  route,
  method = "GET",
  body,
  admin = false,
  requestOrigin = origin,
) {
  return JSON.parse(
    await execute(`
    const response=await fetch('http://127.0.0.1:8788'+${JSON.stringify(route)}, {
      method:${JSON.stringify(method)}, signal:AbortSignal.timeout(5000), redirect:'error',
      headers:{'content-type':'application/json',origin:${JSON.stringify(requestOrigin)},
      ...(${admin}?{authorization:'Bearer '+process.env.LOCAL_ADMIN_TOKEN}:{})},
      ...(${body !== undefined}?{body:JSON.stringify(${JSON.stringify(body) ?? "null"})}:{})
    }); console.log(JSON.stringify({status:response.status,body:await response.json()}));
  `),
  );
}
async function start(readonly = false) {
  await docker([
    "run",
    "--detach",
    "--name",
    container,
    "--label",
    `reporecode-check=${id}`,
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--memory",
    "256m",
    "--pids-limit",
    "100",
    "--tmpfs",
    "/tmp:rw,nosuid,noexec,size=16m",
    "--mount",
    `type=volume,source=${volume},target=/app/data${readonly ? ",readonly" : ""}`,
    "--env",
    `APP_ORIGIN=${origin}`,
    "--env",
    "COMMUNITY_STORAGE_PATH=/app/data/community.json",
    "--env",
    "LOCAL_ADMIN_TOKEN",
    "--env",
    "NODE_ENV=test",
    image,
  ]);
  for (let i = 0; i < 25; i++) {
    try {
      if ((await request("/api/health")).status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw Error("Local storage test container did not become ready");
}
async function check(name, operation) {
  await operation();
  receipt.checks.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
async function store() {
  return JSON.parse(
    await execute(
      "import {readFile} from 'node:fs/promises'; console.log(await readFile('/app/data/community.json','utf8'))",
    ),
  );
}
let created = false,
  failed;
try {
  const endpoint =
    process.env.DOCKER_HOST ||
    (await docker([
      "context",
      "inspect",
      "--format",
      "{{.Endpoints.docker.Host}}",
    ]));
  assert.ok(
    /^unix:\/\/\//.test(endpoint) || /^npipe:\/+\.\/pipe\//.test(endpoint),
    "This check only supports a local Docker socket; remote Docker endpoints are refused.",
  );
  receipt.dockerVersion = await docker([
    "version",
    "--format",
    "{{.Server.Version}}",
  ]);
  if (!process.argv.includes("--skip-build"))
    await docker(
      ["build", "--file", "deploy/gateway.Dockerfile", "--tag", image, "."],
      600000,
    );
  receipt.imageId = await docker([
    "image",
    "inspect",
    image,
    "--format",
    "{{.Id}}",
  ]);
  created = true;
  await docker([
    "volume",
    "create",
    "--label",
    `reporecode-check=${id}`,
    volume,
  ]);
  await start();
  await check(
    "isolated non-root container with one owned persistent volume",
    async () => {
      const config = JSON.parse(await docker(["inspect", container]))[0];
      assert.equal(config.HostConfig.NetworkMode, "none");
      assert.equal(Object.keys(config.HostConfig.PortBindings ?? {}).length, 0);
      assert.equal(config.HostConfig.ReadonlyRootfs, true);
      assert.ok(config.HostConfig.CapDrop.includes("ALL"));
      assert.ok(
        config.HostConfig.SecurityOpt.includes("no-new-privileges:true"),
      );
      const mounts = config.Mounts.filter((m) => m.Type !== "tmpfs");
      assert.equal(mounts.length, 1);
      assert.equal(mounts[0].Type, "volume");
      assert.equal(mounts[0].Name, volume);
      assert.notEqual(await docker(["exec", container, "id", "-u"]), "0");
      assert.equal(
        (await request("/api/community/status")).body.feedbackEnabled,
        true,
      );
      assert.equal((await request("/api/local-admin")).status, 403);
      assert.equal(
        (
          await request(
            "/api/feedback",
            "POST",
            { category: "general", message: "Wrong-origin synthetic test" },
            false,
            "http://wrong-origin.test",
          )
        ).status,
        403,
      );
    },
  );
  const installationId = randomUUID();
  await check(
    "synthetic feedback and activity are written with private file permissions",
    async () => {
      assert.equal(
        (
          await request("/api/feedback", "POST", {
            category: "general",
            message: "Synthetic Docker persistence test only",
            rating: 4,
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await request("/api/activity", "POST", {
            installationId,
            event: "active",
          })
        ).status,
        202,
      );
      const snapshot = await request(
        "/api/local-admin",
        "GET",
        undefined,
        true,
      );
      assert.equal(snapshot.status, 200);
      assert.equal(snapshot.body.community.feedbackCount, 1);
      assert.equal(snapshot.body.community.retainedOptInInstallations, 1);
      const mode = await execute(
        "import {stat} from 'node:fs/promises'; const s=await stat('/app/data/community.json');console.log(JSON.stringify({mode:s.mode&511,uid:s.uid,self:process.getuid()}))",
      );
      assert.deepEqual(JSON.parse(mode), { mode: 384, uid: 1000, self: 1000 });
    },
  );
  await check(
    "feedback and activity survive complete container replacement",
    async () => {
      await docker(["rm", "--force", container]);
      await start();
      const snapshot = await request(
        "/api/local-admin",
        "GET",
        undefined,
        true,
      );
      assert.equal(snapshot.status, 200);
      assert.equal(snapshot.body.community.feedbackCount, 1);
      assert.equal(snapshot.body.community.retainedOptInInstallations, 1);
    },
  );
  await check(
    "activity revocation survives replacement and rejects delayed activity",
    async () => {
      assert.equal(
        (await request("/api/activity", "DELETE", { installationId })).status,
        200,
      );
      await docker(["rm", "--force", container]);
      await start();
      assert.equal(
        (
          await request("/api/activity", "POST", {
            installationId,
            event: "active",
          })
        ).status,
        409,
      );
      const snapshot = await request(
        "/api/local-admin",
        "GET",
        undefined,
        true,
      );
      assert.equal(snapshot.status, 200);
      assert.equal(snapshot.body.community.feedbackCount, 1);
      assert.equal(snapshot.body.community.retainedOptInInstallations, 0);
    },
  );
  await check(
    "a read-only data volume fails closed without changing existing data",
    async () => {
      const before = await store();
      await docker(["rm", "--force", container]);
      await start(true);
      assert.equal(
        (
          await request("/api/feedback", "POST", {
            category: "general",
            message: "This rejected record must not persist",
          })
        ).status,
        503,
      );
      assert.deepEqual(await store(), before);
    },
  );
  const recoverySnapshot = await store();
  await docker(["rm", "--force", container]);
  await start();
  await check(
    "damaged storage returns 503 without overwriting its bytes",
    async () => {
      await execute(
        "import {writeFile} from 'node:fs/promises'; await writeFile('/app/data/community.json','{damaged synthetic store')",
      );
      assert.equal(
        (
          await request("/api/feedback", "POST", {
            category: "general",
            message: "Rejected synthetic damaged-store submission",
          })
        ).status,
        503,
      );
      assert.equal(
        await execute(
          "import {readFile} from 'node:fs/promises'; console.log(await readFile('/app/data/community.json','utf8'))",
        ),
        "{damaged synthetic store",
      );
    },
  );
  await check(
    "restoring the saved snapshot recovers writes and retains revocations",
    async () => {
      await execute(
        `import {writeFile} from 'node:fs/promises'; await writeFile('/app/data/community.json',${JSON.stringify(JSON.stringify(recoverySnapshot))},{mode:0o600})`,
      );
      await docker(["rm", "--force", container]);
      await start();
      assert.equal(
        (
          await request("/api/activity", "POST", {
            installationId,
            event: "active",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request("/api/feedback", "POST", {
            category: "general",
            message: "Synthetic write after snapshot recovery",
          })
        ).status,
        201,
      );
      const restored = await store();
      assert.equal(restored.feedback.length, 2);
      assert.deepEqual(restored.feedback[0], recoverySnapshot.feedback[0]);
      assert.deepEqual(restored.revoked, recoverySnapshot.revoked);
      assert.deepEqual(restored.installations, {});
    },
  );
  receipt.status = "passed";
} catch (error) {
  failed = error;
  receipt.status = "failed";
  receipt.error = String(error.message).replaceAll(
    token,
    "[test token redacted]",
  );
} finally {
  const cleanupErrors = [];
  if (created) {
    for (const [kind, name] of [
      ["container", container],
      ["volume", volume],
    ]) {
      try {
        // Container list uses Names, while volume list uses Name.
        if (kind === "container") {
          const names = await docker([
            "container",
            "ls",
            "--all",
            "--filter",
            `label=reporecode-check=${id}`,
            "--format",
            "{{.Names}}",
          ]);
          if (names === name) await docker(["rm", "--force", name]);
          else assert.equal(names, "");
        } else {
          const names = await docker([
            "volume",
            "ls",
            "--filter",
            `label=reporecode-check=${id}`,
            "--format",
            "{{.Name}}",
          ]);
          if (names === name) await docker(["volume", "rm", name]);
          else assert.equal(names, "");
        }
      } catch (error) {
        cleanupErrors.push(
          String(error.message).replaceAll(token, "[test token redacted]"),
        );
      }
    }
    try {
      assert.equal(
        await docker([
          "container",
          "ls",
          "--all",
          "--filter",
          `label=reporecode-check=${id}`,
          "--format",
          "{{.Names}}",
        ]),
        "",
      );
      assert.equal(
        await docker([
          "volume",
          "ls",
          "--filter",
          `label=reporecode-check=${id}`,
          "--format",
          "{{.Name}}",
        ]),
        "",
      );
    } catch (error) {
      cleanupErrors.push(
        String(error.message).replaceAll(token, "[test token redacted]"),
      );
    }
  }
  receipt.resourcesRemoved = cleanupErrors.length === 0;
  if (cleanupErrors.length) {
    receipt.cleanupErrors = cleanupErrors;
    receipt.status = "failed";
    failed ??= Error("Test resource cleanup failed");
  }
  await mkdir(resolve(root, "artifacts"), { recursive: true });
  await writeFile(
    resolve(root, "artifacts/docker-storage-results.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
}
if (failed) {
  console.error(receipt.error ?? "Test resource cleanup failed");
  process.exitCode = 1;
} else
  console.log(
    `${receipt.checks.length} local storage checks passed; test container and volume removed.`,
  );
