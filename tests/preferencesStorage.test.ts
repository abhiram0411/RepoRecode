import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  defaultPreferences,
  loadPreferences,
  savePreferences,
} from "../src/core/storage";

const values = new Map<string, string>();
const key = "reporecode:preferences:v1";
beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

it("persists before yielding and reads the latest choice before its database write finishes", async () => {
  await savePreferences(defaultPreferences);
  const saving = savePreferences({ ...defaultPreferences, theme: "light" });
  expect(JSON.parse(values.get(key)!).theme).toBe("light");
  expect((await loadPreferences()).theme).toBe("light");
  await saving;
});

it("keeps the latest synchronous selection during rapid consecutive saves", async () => {
  const first = savePreferences({ ...defaultPreferences, theme: "light" });
  const second = savePreferences({ ...defaultPreferences, theme: "crimson" });
  expect(JSON.parse(values.get(key)!).theme).toBe("crimson");
  await Promise.all([first, second]);
  expect((await loadPreferences()).theme).toBe("crimson");
});

it("falls back to existing database preferences if localStorage is blocked", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  });
  await savePreferences({ ...defaultPreferences, theme: "light" });
  expect((await loadPreferences()).theme).toBe("light");
});

it("rejects invalid preferences before saving and ignores invalid cached data", async () => {
  await savePreferences({ ...defaultPreferences, theme: "light" });
  await expect(
    savePreferences({ ...defaultPreferences, theme: "invalid" as never }),
  ).rejects.toThrow();
  expect(JSON.parse(values.get(key)!).theme).toBe("light");
  values.set(key, '{"theme":"invalid"}');
  expect((await loadPreferences()).theme).toBe("light");
  values.set(key, "broken json");
  expect((await loadPreferences()).theme).toBe("light");
});

it("removes a stale cache if quota failure forces the database fallback", async () => {
  await savePreferences(defaultPreferences);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: () => {
      throw Error("quota exceeded");
    },
    removeItem: (key: string) => values.delete(key),
  });
  await savePreferences({ ...defaultPreferences, theme: "light" });
  expect(values.has(key)).toBe(false);
  expect((await loadPreferences()).theme).toBe("light");
});
