import { afterEach, expect, it, vi } from "vitest";
import {
  fetchAuthAvailability,
  parseAuthAvailability,
} from "../src/core/authAvailability";

afterEach(() => vi.unstubAllGlobals());

it("offers GitHub but not a disabled Google provider", () => {
  expect(
    parseAuthAvailability({
      external: { github: true, google: false, email: true },
      disable_signup: false,
    }),
  ).toEqual({ providers: ["github"], email: true, signup: true });
});

it("requires explicit boolean enablement and ignores unsupported providers", () => {
  expect(
    parseAuthAvailability({
      external: { github: "true", google: 1, email: "true", apple: true },
    }),
  ).toEqual({ providers: [], email: false, signup: false });
  expect(
    parseAuthAvailability({ external: { google: true }, disable_signup: true })
      .signup,
  ).toBe(false);
});

it("rejects malformed responses instead of offering every provider", () => {
  for (const raw of [
    null,
    [],
    {},
    { external: null },
    { external: [] },
    "gateway error",
  ])
    expect(() => parseAuthAvailability(raw)).toThrow("could not be checked");
});

it("reads only public settings without browser cookies or session authorization", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ external: { github: true } })),
    );
  vi.stubGlobal("fetch", fetchMock);
  const signal = new AbortController().signal;
  await expect(
    fetchAuthAvailability(
      { url: "https://example.supabase.co", key: "public-test-key" },
      signal,
    ),
  ).resolves.toEqual({ providers: ["github"], email: false, signup: false });
  expect(fetchMock).toHaveBeenCalledWith(
    "https://example.supabase.co/auth/v1/settings",
    {
      headers: { apikey: "public-test-key" },
      credentials: "omit",
      redirect: "error",
      signal,
    },
  );
});

it("does not expose provider response contents on an HTTP error", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("private upstream diagnostics", { status: 503 }),
      ),
  );
  await expect(
    fetchAuthAvailability(
      { url: "https://example.supabase.co", key: "public-test-key" },
      new AbortController().signal,
    ),
  ).rejects.toThrow(/^Sign-in methods could not be checked\.$/);
});

it("propagates cancellation without a fallback to enabled providers", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
  );
  await expect(
    fetchAuthAvailability(
      { url: "https://example.supabase.co", key: "public-test-key" },
      new AbortController().signal,
    ),
  ).rejects.toHaveProperty("name", "AbortError");
});
