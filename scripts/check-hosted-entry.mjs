import assert from "node:assert/strict";
import { createServer } from "node:http";
import gateway from "../api/index.mjs";

// Native Node smoke check for the deployed entry graph, without Vitest's
// transforms, service credentials, external requests or local file storage.
process.env.HOSTED_BACKEND_ENABLED = "false";
const server = createServer(gateway);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${origin}/api/index?route=health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: "ok",
    aiConfigured: false,
    authConfigured: false,
    accountDeletionConfigured: false,
  });
  const status = await fetch(`${origin}/api/index?route=community/status`);
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
