// Local container acceptance: no cloud credentials, real accounts or deployment.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { unzipSync } from "fflate";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = {
  cwd: root,
  windowsHide: true,
  timeout: 30000,
  maxBuffer: 4 * 1024 * 1024,
};
const docker = async (args, extra = {}) =>
  (await run("docker", args, { ...options, ...extra })).stdout.trim();
const names = ["web", "gateway"].map(
  (kind) => `reporecode-${kind}-check-${randomUUID()}`,
);
const images = ["reporecode-web:local-check", "reporecode-gateway:local-check"];
const receipt = {
  date: new Date().toISOString(),
  scope: "Local Docker images with no provider configuration",
  checks: [],
  containersRemoved: false,
  limitations: [
    "Does not verify live cloud services, production HTTPS proxy or persistent backend data volumes",
  ],
};
async function check(name, fn) {
  await fn();
  receipt.checks.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
const get = (url) =>
  fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error" });
async function ready(url) {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await get(url)).ok) return;
    } catch {
      /* container starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Error(`Container did not become ready: ${url}`);
}
let failed;
try {
  receipt.dockerVersion = await docker([
    "version",
    "--format",
    "{{.Server.Version}}",
  ]);
  if (!process.argv.includes("--skip-build")) {
    await docker(["build", "--tag", images[0], "."], { timeout: 600000 });
    await docker(
      ["build", "--file", "deploy/gateway.Dockerfile", "--tag", images[1], "."],
      { timeout: 600000 },
    );
  }
  receipt.imageIds = await Promise.all(
    images.map((image) =>
      docker(["image", "inspect", image, "--format", "{{.Id}}"]),
    ),
  );
  const origins = [];
  for (let i = 0; i < 2; i++) {
    const port = i === 0 ? "8080" : "8788";
    await docker([
      "run",
      "--detach",
      "--name",
      names[i],
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges:true",
      "--tmpfs",
      "/tmp:rw,nosuid,noexec,size=64m",
      "--memory",
      "256m",
      "--pids-limit",
      "100",
      "--publish",
      `127.0.0.1::${port}`,
      images[i],
    ]);
    const address = await docker(["port", names[i], `${port}/tcp`]);
    assert.match(address, /^127\.0\.0\.1:\d+$/);
    origins.push(`http://${address}`);
  }
  let [web, gateway] = origins;
  receipt.origins = { web, gateway };
  await ready(web);
  await ready(`${gateway}/api/health`);
  await check(
    "both containers run unprivileged with read-only roots",
    async () => {
      for (const name of names) {
        const config = JSON.parse(await docker(["inspect", name]))[0];
        assert.equal(config.HostConfig.ReadonlyRootfs, true);
        assert.ok(config.HostConfig.CapDrop.includes("ALL"));
        assert.ok(
          config.HostConfig.SecurityOpt.includes("no-new-privileges:true"),
        );
        assert.notEqual(await docker(["exec", name, "id", "-u"]), "0");
        await assert.rejects(
          docker(["exec", name, "touch", "/container-readonly-probe"]),
        );
      }
    },
  );
  await check(
    "web serves HTML, client routing, assets and security headers",
    async () => {
      const response = await get(web);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, /RepoRecode/);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("x-frame-options"), "DENY");
      assert.match(
        response.headers.get("content-security-policy"),
        /frame-ancestors 'none'/,
      );
      assert.equal(
        await (await get(`${web}/sample/client-route`)).text(),
        html,
      );
      const script = html.match(/src="([^"]+\.js)"/);
      assert.ok(script);
      const asset = await get(new URL(script[1], web));
      assert.equal(asset.status, 200);
      assert.match(asset.headers.get("content-type"), /javascript/);
    },
  );
  await check("unconfigured static API is unavailable", async () => {
    assert.equal((await get(`${web}/api/health`)).status, 503);
  });
  await check(
    "downloaded source contains examples and excludes local data",
    async () => {
      const response = await get(`${web}/downloads/reporecode-source.zip`);
      assert.equal(response.status, 200);
      const files = Object.keys(
        unzipSync(new Uint8Array(await response.arrayBuffer())),
      );
      assert.ok(files.includes("reporecode/.env.example"));
      assert.ok(
        files.includes("reporecode/scripts/check-postgres-concurrency.mjs"),
      );
      assert.ok(
        files.every(
          (file) =>
            !/^reporecode\/(?:tmp|data|\.git|\.gsd|\.vercel)\//.test(file),
        ),
      );
      assert.ok(
        files.every((file) => !/(?:^|\/)\.env(?:$|\.(?!example$))/.test(file)),
      );
    },
  );
  await check(
    "gateway is reachable and reports unconfigured services truthfully",
    async () => {
      const response = await get(`${gateway}/api/health`);
      assert.deepEqual(await response.json(), {
        status: "ok",
        aiConfigured: false,
        authConfigured: false,
        accountDeletionConfigured: false,
      });
      assert.equal((await get(`${gateway}/api/github/callback`)).status, 503);
      const status = await (
        await get(`${gateway}/api/community/status`)
      ).json();
      assert.equal(status.feedbackEnabled, false);
      assert.equal(status.telemetryEnabled, false);
    },
  );
  await check("web and gateway recover after container restart", async () => {
    for (const name of names) await docker(["restart", name]);
    // Docker may allocate new host ports when restarting a container published
    // with an ephemeral port. Resolve them again before testing reachability.
    const addresses = await Promise.all(
      names.map((name, index) =>
        docker(["port", name, index === 0 ? "8080/tcp" : "8788/tcp"]),
      ),
    );
    for (const address of addresses)
      assert.match(address, /^127\.0\.0\.1:\d+$/);
    [web, gateway] = addresses.map((address) => `http://${address}`);
    receipt.originsAfterRestart = { web, gateway };
    await ready(web);
    await ready(`${gateway}/api/health`);
  });
  if (process.argv.includes("--browser")) {
    await check(
      "browser import, grading, reload and interactive preview against Docker",
      async () => {
        const result = await run(
          process.execPath,
          [
            "node_modules/@playwright/test/cli.js",
            "test",
            "e2e/journey.spec.ts",
            "e2e/generic-async-practice.spec.ts",
            "e2e/object-constraint-practice.spec.ts",
            "e2e/state-derivations.spec.ts",
            "e2e/preview.spec.ts",
            "--reporter=list,json",
          ],
          {
            ...options,
            timeout: 300000,
            env: {
              ...process.env,
              TEST_URL: web,
              PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(
                root,
                "artifacts",
                "docker-browser-results.json",
              ),
            },
          },
        );
        console.log(result.stdout);
      },
    );
  }
  receipt.status = "passed";
} catch (error) {
  failed = error;
  receipt.status = "failed";
  receipt.error = String(error.message);
} finally {
  const cleanupErrors = [];
  for (const name of names) {
    try {
      const existing = await docker([
        "container",
        "ls",
        "-a",
        "--filter",
        `name=^/${name}$`,
        "--format",
        "{{.Names}}",
      ]);
      if (existing === name) await docker(["rm", "--force", "--volumes", name]);
      assert.equal(
        await docker([
          "container",
          "ls",
          "-a",
          "--filter",
          `name=^/${name}$`,
          "--format",
          "{{.Names}}",
        ]),
        "",
      );
    } catch (error) {
      cleanupErrors.push(String(error.message));
      failed ??= error;
    }
  }
  receipt.containersRemoved = cleanupErrors.length === 0;
  if (cleanupErrors.length) {
    receipt.cleanupErrors = cleanupErrors;
    receipt.status = "failed";
  }
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await writeFile(
    path.join(root, "artifacts", "docker-app-results.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
}
if (failed) throw failed;
console.log(
  `${receipt.checks.length} Docker application checks passed; temporary containers removed.`,
);
