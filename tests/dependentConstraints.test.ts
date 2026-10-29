import { describe, expect, it } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";

const sample = (content: string) =>
  analyze([{ path: "app.ts", content }]).symbols.find((s) => s.name === "f")!;

describe("concrete dependent scalar constraints", () => {
  it("retains dependent bounds while grading independently varied concrete inputs", async () => {
    const s = sample(
      "type Pair<T,U extends T>={readonly first:T;second:U};export function f(x:Pair<boolean,true>){return x.first===x.second}",
    );
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("type Pair<T, U extends T>");
    expect(probes(s)).toEqual([
      [{ first: false, second: true }],
      [{ first: true, second: true }],
    ]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (await evaluate(s, "function f(x:Pair<boolean,true>){return true}"))
        .passed,
    ).toBe(false);
    expect(
      (
        await evaluate(s, "function f(x:Pair<boolean,number>){return true}")
      ).diagnostics.join(" "),
    ).toContain("constraint");
  });

  it("resolves dependent defaults without specializing the read-only definition", async () => {
    const s = sample(
      "type Pair<T extends boolean=boolean,U extends T=T>={first:T;second:U};export function f(x:Pair){return x.first!==x.second}",
    );
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("U extends T = T");
    expect(probes(s)).toContainEqual([{ first: false, second: true }]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });

  it("resolves imported dependent constraints through a concrete inherited base", async () => {
    const s = analyze([
      {
        path: "types.ts",
        content:
          'export type Choice="a"|"b";export interface Base<T extends Choice,U extends T>{readonly first:T;second:U} export interface Concrete extends Base<Choice,"b">{}',
      },
      {
        path: "barrel.ts",
        content: "export type {Base as Pair,Concrete} from './types'",
      },
      {
        path: "app.ts",
        content:
          'import type {Pair as Input,Concrete} from "./barrel";export function f(x:Input<"a"|"b","a">,y:Concrete){return x.first===y.second}',
      },
    ]).symbols.find((s) => s.name === "f")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain('T extends "a" | "b", U extends T');
    expect(s.practiceTypes).not.toContain("Choice");
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });

  it.each([
    ["T,U extends T", "number,1"],
    ["T,U extends T,V extends U", "number,1|2,2"],
    ["T,U extends T|boolean", "number,true"],
    ["T,U extends T|boolean=true", "number"],
    ["T,U extends T", "number|null,null"],
    ["T,U extends T", "number|undefined,undefined"],
  ])("accepts finite concrete domains for %s", (params, args) => {
    const last = params.includes("V extends") ? "V" : "U";
    expect(
      sample(
        `type Box<${params}>={value:${last}};export function f(x:Box<${args}>){return x.value}`,
      ).standalone,
    ).toBe(true);
  });

  it.each(["T,U extends T|boolean", "T extends number,U extends T"])(
    "rejects a broader concrete argument than %s permits",
    (params) => {
      expect(
        sample(
          `type Box<${params}>={value:U};export function f(x:Box<1|2,number>){return x.value}`,
        ).standalone,
      ).toBe(false);
    },
  );

  it.each([
    "type Box<T,U extends T=number>={value:U};export function f(x:Box<number>){return x.value}",
    "type Box<T extends number,U extends T=1>={value:U};export function f(x:Box<number>){return x.value}",
    "type Box<T,U extends T>={value:U};export function f(x:Box<number,string>){return x.value}",
    "type Box<T,U extends T>={value:U};export function f(x:Box<{a:number[]},{a:number[]}>){return x.value}",
    "type Box<T extends U,U>={value:T};export function f(x:Box<1,number>){return x.value}",
    "type Box<T extends T>={value:T};export function f(x:Box<number>){return x.value}",
    "type Box<T,U extends T=U>={value:U};export function f(x:Box<number>){return x.value}",
    "type Box<T,U extends T,V extends U>={value:V};export function f(x:Box<number,1,2>){return x.value}",
    "type Box<T,U extends T>={value:U};type Wrap<T>=Box<T,1>;export function f(x:Wrap<number>){return x.value}",
  ])(
    "rejects invalid defaults, cycles, object bounds and unresolved wrappers: %s",
    (content) => {
      expect(sample(content).standalone).toBe(false);
    },
  );

  it("uses declaration identities when names shadow an outer alias", async () => {
    const s = sample(
      "type T=string;type Box<T,U extends T>={value:U};export function f(x:Box<boolean,true>){return x.value}",
    );
    expect(s.standalone).toBe(true);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });

  it("invalidates imported contracts when a dependent bound narrows", () => {
    const index = createAnalyzer();
    const app = {
      path: "app.ts",
      content:
        'import type {Box} from "./types";export function f(x:Box<number,1>){return x.value}',
    };
    const before = index([
      { path: "types.ts", content: "export type Box<T,U extends T>={value:U}" },
      app,
    ]);
    const after = index([
      { path: "types.ts", content: "export type Box<T,U extends 2>={value:U}" },
      app,
    ]);
    expect(
      before.analysis.symbols.find((s) => s.name === "f")!.standalone,
    ).toBe(true);
    expect(after.analysis.symbols.find((s) => s.name === "f")!.standalone).toBe(
      false,
    );
  });
});
