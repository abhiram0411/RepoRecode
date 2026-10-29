import { describe, it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";
import { functionStub } from "../src/core/functionStub";
const sample = (content: string) =>
  analyze([{ path: "app.ts", content }]).symbols.find((s) => s.name === "f")!;
describe("bounded generic functions", () => {
  it("grades independently varied scalar inputs and retains the generic rewrite signature", async () => {
    const s = sample(
      "export function f<T extends number>(a:T,b:T){return a-b}",
    );
    expect(s.standalone).toBe(true);
    expect(functionStub(s, "Rewrite")).toContain(
      "function f<T extends number>(a:T, b:T)",
    );
    expect(probes(s)).toContainEqual([0, 1]);
    expect(probes(s).length).toBeLessThanOrEqual(64);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (await evaluate(s, "function f<T extends number>(a:T,b:T){return 0}"))
        .passed,
    ).toBe(false);
  });
  it("preserves literal-domain branches rather than testing only the default", async () => {
    const s = sample(
      'export function f<T extends "a"|"b"="a">(value:T){return value==="a"?1:2}',
    );
    expect(s.standalone).toBe(true);
    expect(probes(s)).toEqual([["a"], ["b"]]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          'function f<T extends "a"|"b"="a">(value:T){return 1}',
        )
      ).passed,
    ).toBe(false);
  });
  it("retains imported constraint names and generic aliases in a self-contained context", async () => {
    const s = analyze([
      {
        path: "types.ts",
        content:
          "export type Numeric=number;export type Box<T>={readonly value:T}",
      },
      {
        path: "app.ts",
        content:
          'import type {Numeric as Bound,Box} from "./types";export function f<T extends Bound>(x:Box<T>):T{return x.value}',
      },
    ]).symbols.find((s) => s.name === "f")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("type Bound = number;");
    expect(s.practiceTypes).toContain("type Box<T>");
    expect(s.practiceTypes).not.toContain("type T =");
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it.each([
    "export const f=<T extends number>(x:T)=>x*2;",
    "export const f=function<T extends string>(x:T){return x.trim()};",
    "export function f<T extends number>(x:T[]){return x.length}",
    "export function f<T extends boolean>(x:readonly T[]){return x.length}",
    "export function f<T extends number,U extends boolean>(x:[T,U]){return x[0]+(x[1]?1:0)}",
    "export function f<T extends boolean>(x:{value:T}){return !x.value}",
    "export function f<T extends {value:number}>(x:T){return x.value}",
    "export async function f<T extends number>(x:T):Promise<T>{return await Promise.resolve(x)}",
    "export function f<T extends boolean>(x?:T){return x===undefined?2:x?1:0}",
    'export function f<T extends boolean|string>(x:T){return typeof x=== "string"?x.length:x?1:0}',
  ])("evaluates supported function forms: %s", async (content) => {
    const s = sample(content);
    expect(s.standalone).toBe(true);
    expect(probes(s).length).toBeGreaterThan(0);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it.each([
    "export function f<T>(x:T){return x}",
    "export function f<T=number>(x:T){return x}",
    "export function f<T extends unknown>(x:T){return x}",
    "export function f<T extends any>(x:T){return x}",
    "export function f<T extends number=string>(x:T){return x}",
    "export function f<T extends number,U extends boolean=T>(x:U){return x}",
    "export function f<T extends number=number,U extends boolean>(x:T,y:U){return x}",
    "export function f<T extends number,U extends number,V extends number,W extends number>(x:T){return x}",
    "export function f<const T extends number>(x:T){return x}",
    "export function f<T extends Missing>(x:T){return x}",
    "export function f<T extends number>(...x:T[]){return x.length}",
  ])("keeps unsupported generic contracts explicit: %s", (content) => {
    const s = sample(content);
    expect(s.standalone).toBe(false);
    expect(probes(s)).toEqual([]);
  });
  it("checks the original generic signature rather than compiling its scalar replacement", async () => {
    const s = sample("export function f<T extends number>(x:T):T{return 1}");
    const result = await evaluate(s, s.code);
    expect(result.passed).toBe(false);
    expect(result.supported).toBe(false);
    expect(result.diagnostics.join(" ")).toContain(
      "Reference cannot be evaluated",
    );
  });
  it("invalidates imported function constraints after source changes", () => {
    const index = createAnalyzer();
    const app = {
      path: "app.ts",
      content:
        'import type {Bound} from "./types";export function f<T extends Bound>(x:T){return x}',
    };
    const a = index([
      { path: "types.ts", content: "export type Bound=boolean" },
      app,
    ]);
    const b = index([
      { path: "types.ts", content: 'export type Bound="a"|"b"' },
      app,
    ]);
    expect(probes(a.analysis.symbols.find((s) => s.name === "f")!)).toEqual([
      [false],
      [true],
    ]);
    expect(probes(b.analysis.symbols.find((s) => s.name === "f")!)).toEqual([
      ["a"],
      ["b"],
    ]);
  });
});
