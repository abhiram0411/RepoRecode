import { expect, it } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import {
  featureMissionIds,
  isFeatureMission,
  missionOutput,
} from "../src/core/featureMissions";
import { restoreBackup } from "../src/core/backup";
import type { Preferences } from "../src/core/types";
import { exportProgress, mergeProgress } from "../src/core/progress";
const defaultPreferences = {
  level: "beginner",
  goal: "understand",
} as Preferences;

const symbol = (content: string) =>
  analyze([{ path: "a.ts", content }]).symbols[0];

it.each([
  [
    "uppercase-output",
    "function greeting(name:string){return 'hello '+name;}",
    "function greeting(name:string){return ('hello '+name).toUpperCase();}",
  ],
  [
    "negate-output",
    "function positive(n:number){return n>0;}",
    "function positive(n:number){return n<=0;}",
  ],
] as const)(
  "grades %s against changed behavior, not unchanged source",
  async (mission, reference, candidate) => {
    const s = symbol(reference);
    expect((await evaluate(s, reference, mission)).passed).toBe(false);
    const result = await evaluate(s, candidate, mission);
    expect(result.supported).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.cases.length).toBeGreaterThan(2);
  },
);

it("supports locally resolved async string outputs", async () => {
  const s = symbol(
    "async function greet(name:string):Promise<string>{return 'hello '+name;}",
  );
  expect(
    (
      await evaluate(
        s,
        "async function greet(name:string):Promise<string>{return ('hello '+name).toUpperCase();}",
        "uppercase-output",
      )
    ).passed,
  ).toBe(true);
});

it.each([
  ["uppercase-output", "function value(n:number){return n>0?'text':false;}"],
  ["negate-output", "function value(n:number){return n>0?true:0;}"],
  ["double-output", "function value(){return 1e308;}"],
] as const)(
  "rejects incompatible or overflowing %s outputs without partial cases",
  async (mission, reference) => {
    const result = await evaluate(symbol(reference), reference, mission);
    expect(result.supported).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.cases).toEqual([]);
  },
);

it.each([
  ["uppercase-output", "function value(){return 'ALREADY UPPER';}"],
  ["uppercase-output", "function value(){return '';}"],
  ["double-output", "function value(){return 0;}"],
] as const)(
  "does not reward an indistinguishable %s mission",
  async (mission, reference) => {
    const result = await evaluate(symbol(reference), reference, mission);
    expect(result.supported).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.join(" ")).toContain("cannot distinguish");
  },
);

it("rejects unknown mission IDs even when a worker sends invalid runtime data", async () => {
  for (const value of [
    "toString",
    "__proto__",
    "constructor",
    "invented",
    null,
  ]) {
    expect(isFeatureMission(value)).toBe(false);
    const s = symbol("function value(n:number){return n;}");
    // @ts-expect-error exercise untyped worker messages
    expect((await evaluate(s, s.code, value)).supported).toBe(false);
  }
});

it("preserves typed boolean keys and bounds Unicode-expanded strings", () => {
  expect(
    missionOutput("negate-output", { type: "boolean", value: false }),
  ).toEqual({
    display: '{"value":true,"type":"boolean"}',
    key: '["boolean",true]',
  });
  expect(
    missionOutput("uppercase-output", { type: "string", value: "straße" }).key,
  ).toBe('["string","STRASSE"]');
  expect(() =>
    missionOutput("uppercase-output", {
      type: "string",
      value: "ß".repeat(9000),
    }),
  ).toThrow("size limit");
});

it("round-trips all mission IDs through backup and progress without accepting unknown exercises", async () => {
  const raw = {
    id: "cfeb7933-b703-493a-8418-b04039f10f38",
    name: "Example",
    origin: "fixture",
    importedAt: "2026-01-01T00:00:00.000Z",
    files: [{ path: "a.ts", content: "function value(n:number){return n;}" }],
    completed: [],
    attempts: [],
    drafts: {},
  };
  const p = restoreBackup(raw, defaultPreferences),
    id = p.analysis.symbols[0].id;
  const missions = Object.fromEntries(
    featureMissionIds.map((m) => [id + ":" + m, true]),
  );
  const restored = restoreBackup(
    {
      ...raw,
      missions: {
        ...missions,
        [id + ":invented"]: true,
        "unknown:uppercase-output": true,
      },
    },
    defaultPreferences,
  );
  expect(restored.missions).toEqual(missions);
  const progress = await exportProgress(restored);
  const merged = await mergeProgress(p, progress);
  expect(merged.missions).toEqual(missions);
  expect(
    (await mergeProgress(merged, await exportProgress(p))).missions,
  ).toEqual(missions);
  const before = JSON.stringify(p);
  await expect(
    mergeProgress(p, { ...progress, missions: { [id + ":invented"]: true } }),
  ).rejects.toThrow("unknown exercise");
  expect(JSON.stringify(p)).toBe(before);
});
