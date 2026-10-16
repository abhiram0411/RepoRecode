import { describe, it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";
const sample = (prefix: string) =>
  analyze([
    {
      path: "app.ts",
      content:
        prefix +
        " export function score(input:Input){return input.count+(input.enabled?10:0);}",
    },
  ]).symbols.find((s) => s.name === "score")!;

describe("bounded inherited interface contracts", () => {
  it("preserves inherited readonly and optional fields in probes and grading", async () => {
    const s = sample(
      "interface Base{readonly count:number} interface Input extends Base{enabled?:boolean}",
    );
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain('readonly "count": number');
    expect(probes(s)).toEqual(
      expect.arrayContaining([
        [{ count: 0 }],
        [{ count: 0, enabled: undefined }],
        [{ count: 0, enabled: true }],
        [{ count: -1 }],
      ]),
    );
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (await evaluate(s, "function score(input:Input){return input.count;}"))
        .passed,
    ).toBe(false);
    const readonly = await evaluate(
      s,
      "function score(input:Input){input.count=2;return input.count+(input.enabled?10:0);}",
    );
    expect(readonly.passed).toBe(false);
    expect(readonly.diagnostics.join(" ")).toContain("read-only");
  });
  it("resolves base interfaces through renamed imports and reexports", () => {
    const a = analyze([
      { path: "base.ts", content: "export interface Base{count:number}" },
      {
        path: "barrel.ts",
        content: "export type {Base as Shape} from './base'",
      },
      {
        path: "app.ts",
        content:
          "import type {Shape as Parent} from './barrel'; interface Input extends Parent{enabled:boolean} export function score(input:Input){return input.count+(input.enabled?10:0);}",
      },
    ]);
    const s = a.symbols.find((s) => s.name === "score")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain('"count": number');
    expect(s.practiceTypes).not.toContain("extends");
  });
  it("accepts multiple distinct bases and nested inherited fields within existing limits", () => {
    expect(
      sample(
        "interface A{count:number} interface B{enabled:boolean} interface Input extends A,B{}",
      ).standalone,
    ).toBe(true);
    const s = analyze([
      {
        path: "app.ts",
        content:
          "interface A{active:boolean} interface B extends A{} interface Input{settings?:B} export function read(input:Input){return input.settings?.active??false;}",
      },
    ]).symbols.find((s) => s.name === "read")!;
    expect(s.standalone).toBe(true);
    expect(probes(s)).toEqual(
      expect.arrayContaining([[{ settings: { active: true } }]]),
    );
  });
  it.each([
    "interface A{count:number} interface Input extends A{count:number;enabled:boolean}",
    "interface A{count:number} interface B extends A{} interface C extends A{} interface Input extends B,C{enabled:boolean}",
    "interface A extends Input{} interface Input extends A{}",
    "interface A{count:number} interface A{enabled:boolean} interface Input extends A{}",
    "interface Input extends Missing{}",
    "type A={count:number};interface Input extends A{enabled:boolean}",
    "namespace N{export interface A{count:number}}interface Input extends N.A{enabled:boolean}",
    "interface A{count:number;a:boolean;b:boolean} interface Input extends A{enabled:boolean}",
    "interface A{count():number} interface Input extends A{enabled:boolean}",
  ])("rejects ambiguous or unsupported inheritance: %s", (prefix) => {
    const s = sample(prefix);
    expect(s.standalone).toBe(false);
    expect(probes(s)).toEqual([]);
  });
  it("rejects deep inheritance before unbounded expansion", () => {
    const chain = Array.from(
      { length: 12 },
      (_, i) => `interface A${i} extends A${i + 1}{}`,
    ).join("");
    expect(
      sample(
        chain +
          "interface A12{count:number;enabled:boolean}interface Input extends A0{}",
      ).standalone,
    ).toBe(false);
  });
  it("recomputes inherited domains when a base changes or disappears", () => {
    const index = createAnalyzer();
    const main = {
      path: "app.ts",
      content:
        "import type {Base} from './base';interface Input extends Base{}export function f(input:Input){return input.value;}",
    };
    const first = index([
      { path: "base.ts", content: "export interface Base{value:boolean}" },
      main,
    ]);
    const second = index([
      { path: "base.ts", content: "export interface Base{value:'yes'|'no'}" },
      main,
    ]);
    expect(probes(first.analysis.symbols.find((s) => s.name === "f")!)).toEqual(
      [[{ value: false }], [{ value: true }]],
    );
    expect(
      probes(second.analysis.symbols.find((s) => s.name === "f")!),
    ).toEqual([[{ value: "yes" }], [{ value: "no" }]]);
    expect(
      index([main]).analysis.symbols.find((s) => s.name === "f")!.standalone,
    ).toBe(false);
  });
});
