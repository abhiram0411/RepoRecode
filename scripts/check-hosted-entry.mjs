import assert from "node:assert/strict";
import { createServer } from "node:http";
import { cp, glob, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Exercise the entry from a separate package tree. A smoke check in the full
// checkout cannot catch a relative source dependency omitted from deployment.
if (!process.argv.includes("--packaged")) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const temporaryRoot = join(root, "tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const packaged = await mkdtemp(join(temporaryRoot, "hosted-entry-"));
  try {
    for (const path of ["api", "server", "package.json"])
      await cp(join(root, path), join(packaged, path), { recursive: true });
    await mkdir(join(packaged, "scripts"));
    await cp(fileURLToPath(import.meta.url), join(packaged, "scripts/check-hosted-entry.mjs"));
    const config = JSON.parse(await readFile(join(root, "vercel.json"), "utf8"));
    const included = config.functions["api/index.mjs"].includeFiles;
    if (included) for await (const path of glob(included, { cwd: root })) {
      await mkdir(dirname(join(packaged, path)), { recursive: true });
      await cp(join(root, path), join(packaged, path));
    }
    execFileSync(process.execPath, [join(packaged, "scripts/check-hosted-entry.mjs"), "--packaged"], {
      cwd: packaged, stdio: "inherit",
      env: { ...process.env, HOSTED_BACKEND_ENABLED: "false" },
    });
  } finally {
    assert.ok(resolve(packaged).startsWith(resolve(temporaryRoot) + sep));
    await rm(packaged, { recursive: true, force: true });
  }
  console.log("Isolated hosted package: declared source includes and native imports passed.");
} else {
  const { default: gateway } = await import("../api/index.mjs");

  // Native Node smoke check for the deployed entry graph, without Vitest's
  // transforms, service credentials, external requests or local file storage.
  process.env.HOSTED_BACKEND_ENABLED = "false";
  const server = createServer(gateway);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${origin}/api/index?route=health&path=health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      status: "ok",
      aiConfigured: false,
      authConfigured: false,
      accountDeletionConfigured: false,
    });
  const status = await fetch(`${origin}/api/index?route=community/status&path=community/status`);
    assert.deepEqual(await status.json(), {
      feedbackEnabled: false,
      telemetryEnabled: false,
      feedbackRetentionDays: 90,
    });
    for (const route of ["local-admin", "missing", "..%2Fadmin"])
      assert.equal(
        (await fetch(`${origin}/api/index?route=${route}`)).status,
        404,
      );
    console.log(
      "Native hosted entry: health, disabled capabilities and API-only routing passed.",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
