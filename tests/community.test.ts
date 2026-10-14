import { it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error JavaScript gateway injected for integration testing.
import { createGateway } from "../server/index.mjs";
it("stores anonymous feedback, bounds input, protects administration and revokes activity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reporecode-community-test-")),
    path = join(directory, "community.json");
  const token = "test-local-operator-token-32-characters",
    origin = "http://127.0.0.1:5173";
  const server = createGateway({
    env: {
      NODE_ENV: "test",
      APP_ORIGIN: origin,
      COMMUNITY_STORAGE_PATH: path,
      LOCAL_ADMIN_TOKEN: token,
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const request = (route: string, body: unknown, method = "POST") =>
    fetch(endpoint + route, {
      method,
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    expect(
      (
        await request("/api/feedback", {
          category: "feature",
          message: "Please add keyboard shortcut help.",
          rating: 5,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await request("/api/feedback", {
          category: "bug",
          message: "too short",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/api/feedback", {
          category: "general",
          message: "Testing unwanted source upload.",
          source: "private code",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/api/feedback", {
          category: "general",
          message: "Automated submission here",
          website: "spam",
        })
      ).status,
    ).toBe(400);
    expect(
      (await fetch(endpoint + "/api/local-admin", { headers: { origin } }))
        .status,
    ).toBe(403);
    const installationId = crypto.randomUUID();
    for (let n = 0; n < 2; n++)
      expect(
        (await request("/api/activity", { installationId, event: "active" }))
          .status,
      ).toBe(202);
    const metrics = async () =>
      await (
        await fetch(endpoint + "/api/local-admin", {
          headers: { origin, Authorization: `Bearer ${token}` },
        })
      ).json();
    const first = (await metrics()).community;
    expect(first.feedbackCount).toBe(1);
    expect(first.averageRating).toBe(5);
    expect(first.retainedOptInInstallations).toBe(1);
    expect(first.releaseDownloads).toBe(null);
    expect(await readFile(path, "utf8")).not.toContain(installationId);
    expect(
      (await request("/api/activity", { installationId }, "DELETE")).status,
    ).toBe(200);
    expect((await metrics()).community.retainedOptInInstallations).toBe(0);
    expect(
      (await request("/api/activity", { installationId, event: "active" }))
        .status,
    ).toBe(409);
    expect((await metrics()).community.retainedOptInInstallations).toBe(0);
    // Reopen the gateway against the same file to check durable persistence through its store.
    // @ts-expect-error JavaScript durable store under integration test.
    const { createCommunity } = await import("../server/community.mjs");
    expect(
      (await createCommunity({ COMMUNITY_STORAGE_PATH: path }).snapshot())
        .feedbackCount,
    ).toBe(1);
    for (let n = 0; n < 5; n++)
      await request("/api/feedback", {
        category: "general",
        message: "Another useful feedback message.",
      });
    expect(
      (
        await request("/api/feedback", {
          category: "general",
          message: "Another useful feedback message.",
        })
      ).status,
    ).toBe(429);
  } finally {
    await new Promise<void>((r) => server.close(r));
    await rm(directory, { recursive: true, force: true });
  }
});
