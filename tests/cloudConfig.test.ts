import { expect, it } from "vitest";
import { cloudConfig } from "../src/core/cloudConfig";
const jwt = (role: string) =>
  `header.${btoa(JSON.stringify({ role })).replaceAll("=", "")}.signature`;
const base = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};
it("keeps unconfigured installs local and accepts public keys", () => {
  expect(cloudConfig({})).toBeNull();
  expect(cloudConfig(base)?.url).toBe(base.VITE_SUPABASE_URL);
  expect(
    cloudConfig({
      VITE_SUPABASE_URL: base.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: jwt("anon"),
    }),
  ).not.toBeNull();
});
it("rejects privileged keys without including their values in diagnostics", () => {
  for (const key of [
    "sb_secret_do_not_print",
    jwt("service_role"),
    jwt("authenticated"),
    "malformed",
  ]) {
    try {
      cloudConfig({ ...base, VITE_SUPABASE_PUBLISHABLE_KEY: key });
      throw Error("unexpected success");
    } catch (e) {
      expect(String(e)).not.toContain(key);
      expect(String(e)).not.toContain("unexpected success");
    }
  }
  expect(() => cloudConfig({ VITE_SERVICE_ROLE_KEY: "private-value" })).toThrow(
    "Server secrets",
  );
});
it("rejects partial and conflicting settings", () => {
  expect(() =>
    cloudConfig({ VITE_SUPABASE_URL: base.VITE_SUPABASE_URL }),
  ).toThrow("both");
  expect(() =>
    cloudConfig({ ...base, VITE_SUPABASE_ANON_KEY: jwt("anon") }),
  ).toThrow("one Supabase");
});
it("requires a secure origin while allowing local Supabase", () => {
  for (const url of [
    "http://example.com",
    "https://example.com/path",
    "https://user:pass@example.com",
    "https://example.com?q=x",
    "invalid",
  ]) {
    expect(() => cloudConfig({ ...base, VITE_SUPABASE_URL: url })).toThrow();
  }
  expect(
    cloudConfig({ ...base, VITE_SUPABASE_URL: "http://127.0.0.1:54321" })?.url,
  ).toBe("http://127.0.0.1:54321");
});
