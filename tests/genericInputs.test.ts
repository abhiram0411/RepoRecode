import { describe, it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";

const sample = (content: string) =>
  analyze([{ path: "app.ts", content }]).symbols.find(
    (s) => s.kind === "function",
  )!;
describe("concrete generic practice contracts", () => {
  it("preserves a generic alias across different concrete arguments and grades independent fields", async () => {
    const s = sample(
      "type Box<T>={readonly value:T};export function read(a:Box<number>,b:Box<boolean>){return a.value+(b.value?10:0)}",
    );
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain('type Box<T> = { readonly "value": T };');
    expect(probes(s)).toEqual(
      expect.arrayContaining([[{ value: 0 }, { value: true }]]),
    );
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function read(a:Box<number>,b:Box<boolean>){return a.value}",
        )
      ).passed,
    ).toBe(false);
    const invalid = await evaluate(
      s,
      "function read(a:Box<number>,b:Box<boolean>){a.value=2;return a.value+(b.value?10:0)}",
    );
    expect(invalid.diagnostics.join(" ")).toContain("read-only");
  });
  it("resolves renamed imported generic interfaces and instantiated bases", async () => {
    const s = analyze([
      {
        path: "base.ts",
        content:
          "export interface Base<T>{readonly value:T} export interface Payload<T> extends Base<T>{active?:boolean}",
      },
      {
        path: "barrel.ts",
        content: "export type {Payload as Wrapped} from './base'",
      },
      {
        path: "app.ts",
        content:
          "import type {Wrapped as Input} from './barrel';export function read(x:Input<number>){return x.value+(x.active?10:0)}",
      },
    ]).symbols.find((s) => s.name === "read")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("type Input<T>");
    expect(s.practiceTypes).toContain('readonly "value": T');
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("handles scalar unions, tuple and array aliases", async () => {
    const s = sample(
      "type Maybe<T>=T|null;type List<T>=ReadonlyArray<T>;type Pair<A,B>=[A,B];export function read(x:Maybe<boolean>,y:List<number>,z:Pair<number,boolean>){return (x?1:0)+y.length+z[0]+(z[1]?10:0)}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s).length).toBeLessThanOrEqual(64);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("uses lexical type parameter identities rather than same-named types", async () => {
    const s = sample(
      "type T=string;type Box<T>={value:T};type Alias<U>=Box<U>;export function read(x:Alias<boolean>){return x.value}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s)).toEqual([[{ value: false }], [{ value: true }]]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("retains nested generic objects within the existing two-level bounds", async () => {
    const s = sample(
      "type Box<T>={value:T};export function read(x:Box<Box<boolean>>){return x.value.value}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s)).toEqual([
      [{ value: { value: false } }],
      [{ value: { value: true } }],
    ]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it.each([
    "type Box<T extends number>={value:T};export function f(x:Box<number>){return 1}",
    "type Box<T>={value:T};export function f(x:Box){return 1}",
    "type Box<T>={value:T};export function f(x:Box<number,boolean>){return 1}",
    "type Box<T>={value:Box<T>};export function f(x:Box<number>){return 1}",
    "type Box<T>=Box<T[]>;export function f(x:Box<number>){return 1}",
    "type Box<A,B,C,D>={value:A};export function f(x:Box<number,number,number,number>){return 1}",
    "type Box<T>={value:T};export function f<T>(x:Box<T>){return x.value}",
    "type Box<T>={value:T};export function f(x:Box<Box<Box<number>>>){return 1}",
    "type Box<T>=T extends number?number:string;export function f(x:Box<number>){return 1}",
  ])("rejects unsupported or unbounded generic forms: %s", (content) => {
    expect(sample(content).standalone).toBe(false);
  });
  it("refreshes concrete probes when an imported generic shape changes", () => {
    const index = createAnalyzer();
    const main = {
      path: "app.ts",
      content:
        "import type {Box} from './type';export function f(x:Box<boolean>){return x.value}",
    };
    const a = index([
      { path: "type.ts", content: "export type Box<T>={value:T}" },
      main,
    ]);
    const b = index([
      { path: "type.ts", content: "export type Box<T>={value:T|null}" },
      main,
    ]);
    expect(
      probes(a.analysis.symbols.find((s) => s.name === "f")!),
    ).toHaveLength(2);
    expect(probes(b.analysis.symbols.find((s) => s.name === "f")!)).toEqual(
      expect.arrayContaining([[{ value: null }]]),
    );
  });
  it("grades omitted defaults and explicit overrides without losing readonly checks", async () => {
    const s = sample(
      "type Box<T=number>={readonly value:T};export function f(a:Box,b:Box<boolean>){return a.value+(b.value?10:0)}",
    );
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("type Box<T = number>");
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (await evaluate(s, "function f(a:Box,b:Box<boolean>){return a.value}"))
        .passed,
    ).toBe(false);
    expect(
      (
        await evaluate(
          s,
          "function f(a:Box,b:Box<boolean>){a.value=0;return a.value+(b.value?10:0)}",
        )
      ).diagnostics.join(" "),
    ).toContain("read-only");
  });
  it("resolves dependent defaults in declaration scope and explicit arguments in caller scope", async () => {
    const s = sample(
      "type Pair<A=boolean,B=A>={a:A;b:B};type Outer<B>=Pair<B>;export function f(x:Outer<boolean>){return x.a!==x.b}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s)).toContainEqual([{ a: false, b: true }]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    const direct = sample(
      "type Pair<A=boolean,B=A>={a:A;b:B};export function f(x:Pair){return x.a!==x.b}",
    );
    expect(direct.practiceTypes).toContain("type Pair<A = boolean, B = A>");
    expect((await evaluate(direct, direct.code)).passed).toBe(true);
  });
  it("flattens imported defaults and inherited defaults into a self-contained type context", async () => {
    const s = analyze([
      {
        path: "base.ts",
        content:
          "export type Flag=boolean;export interface Base<T=Flag>{readonly value:T}",
      },
      {
        path: "types.ts",
        content:
          "import type {Base,Flag} from './base';export interface Shape<T=Flag> extends Base<T>{enabled?:boolean} export interface Inherited extends Base {}",
      },
      {
        path: "app.ts",
        content:
          "import type {Shape as Input,Inherited} from './types';export function f(a:Input,b:Inherited){return a.value && b.value && !!a.enabled}",
      },
    ]).symbols.find((s) => s.name === "f")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("type Input<T = boolean>");
    expect(s.practiceTypes).not.toContain("Flag");
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("allows partial arguments with compound defaults inside the existing limits", async () => {
    const s = sample(
      "type Box<T,U={value:T}>={data:U};export function f(x:Box<boolean>){return x.data.value}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s)).toEqual([
      [{ data: { value: false } }],
      [{ data: { value: true } }],
    ]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it.each([
    "type Box<T=T>={value:T};export function f(x:Box){return 1}",
    "type Box<T=U,U=number>={value:T};export function f(x:Box){return 1}",
    "type Box<T=number,U>={value:U};export function f(x:Box<number,boolean>){return 1}",
    "type Box<T=Box>={value:T};export function f(x:Box){return 1}",
    "type Box<T={a:{b:{c:boolean}}}>={value:T};export function f(x:Box){return 1}",
    "type Box<T extends number=number>={value:T};export function f(x:Box){return 1}",
    "type Box<T=Missing>={value:T};export function f(x:Box<number>){return 1}",
  ])(
    "rejects invalid, cyclic, constrained or oversized defaults: %s",
    (content) => {
      expect(sample(content).standalone).toBe(false);
    },
  );
  it("refreshes probes when an imported default changes", () => {
    const index = createAnalyzer();
    const main = {
      path: "app.ts",
      content:
        "import type {Box} from './types';export function f(x:Box){return x.value}",
    };
    const old = index([
      { path: "types.ts", content: "export type Box<T=boolean>={value:T}" },
      main,
    ]);
    const next = index([
      {
        path: "types.ts",
        content: "export type Box<T=boolean|null>={value:T}",
      },
      main,
    ]);
    expect(
      probes(old.analysis.symbols.find((s) => s.name === "f")!),
    ).toHaveLength(2);
    expect(
      probes(next.analysis.symbols.find((s) => s.name === "f")!),
    ).toContainEqual([{ value: null }]);
  });
});
