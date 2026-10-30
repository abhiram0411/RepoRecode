import { it, expect } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error JavaScript gateway injected for integration testing.
import { createGateway } from "../server/index.mjs";
it("reports damaged storage as unavailable, preserves it and recovers after repair", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "reporecode-corrupt-store-test-"),
  );
  const path = join(directory, "community.json");
  const origin = "http://127.0.0.1:5173";
  const damaged = '{"feedback":["truncated';
  const server = createGateway({
    env: {
      NODE_ENV: "test",
      APP_ORIGIN: origin,
      COMMUNITY_STORAGE_PATH: path,
    },
  });
  try {
    await writeFile(path, damaged);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const endpoint = `http://127.0.0.1:${server.address().port}`;
    const submit = (body: string) =>
      fetch(endpoint + "/api/feedback", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body,
      });
    const valid = JSON.stringify({
      category: "general",
      message: "Synthetic storage recovery check",
    });
    const response = await submit(valid);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Submission could not be stored. Please try later.",
    });
    expect(await readFile(path, "utf8")).toBe(damaged);
    expect((await submit("{")).status).toBe(400);
    expect(await readFile(path, "utf8")).toBe(damaged);
    await writeFile(
      path,
      JSON.stringify({ feedback: [], installations: {}, revoked: {} }),
    );
    expect((await submit(valid)).status).toBe(201);
    expect(JSON.parse(await readFile(path, "utf8")).feedback).toHaveLength(1);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await rm(directory, { recursive: true, force: true });
  }
});
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
