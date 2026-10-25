import { afterEach, expect, it, vi } from "vitest";
import {
  accountDeletionAvailable,
  deleteCloudAccount,
} from "../src/core/accountService";

afterEach(() => vi.unstubAllGlobals());
it("does not infer deletion availability from a healthy auth-only gateway", async () => {
  for (const body of [
    { status: "ok", authConfigured: true },
    { status: "ok", accountDeletionConfigured: "true" },
    null,
  ]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    expect(await accountDeletionAvailable(new AbortController().signal)).toBe(
      false,
    );
  }
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ status: "ok", accountDeletionConfigured: true }),
      ),
  );
  expect(await accountDeletionAvailable(new AbortController().signal)).toBe(
    true,
  );
});
it("never sends an authenticated deletion request without a session", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(deleteCloudAccount(undefined)).rejects.toThrow("Sign in again");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects missing endpoints and expired sessions without parsing server diagnostics", async () => {
  for (const status of [404, 405, 503, 401]) {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>upstream error</html>", { status }),
        ),
    );
    await expect(deleteCloudAccount("test-token")).rejects.toThrow(
      status === 401 ? "Sign in again" : "unavailable",
    );
  }
});
it("never treats a static HTML fallback or malformed success as confirmed deletion", async () => {
  for (const body of [
    "<html>SPA shell</html>",
    "{}",
    '{"deleted":"true"}',
    "null",
  ]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    await expect(deleteCloudAccount("test-token")).rejects.toThrow(
      "could not be confirmed",
    );
  }
});
it("sends explicit confirmation without a target user and accepts only confirmed success", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ deleted: true }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(deleteCloudAccount("test-token")).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/account",
    expect.objectContaining({
      method: "DELETE",
      redirect: "error",
      credentials: "omit",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: '{"confirmation":"DELETE"}',
      signal: expect.any(AbortSignal),
    }),
  );
});
