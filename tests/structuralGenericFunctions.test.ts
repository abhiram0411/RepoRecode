import { describe, it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";
import { functionStub } from "../src/core/functionStub";
const sample = (content: string) =>
  analyze([{ path: "app.ts", content }]).symbols.find((s) => s.name === "f")!;

describe("small-object generic functions", () => {
  it("varies object fields, rejects a wrong rewrite and preserves the generic signature", async () => {
    const s = sample(
      "export function f<T extends {value:number;enabled:boolean}>(x:T){return x.value+(x.enabled?10:0)}",
    );
    expect(s.standalone).toBe(true);
    expect(functionStub(s, "Rewrite")).toContain(
      "<T extends {value:number;enabled:boolean}>",
    );
    expect(probes(s)).toContainEqual([{ value: 0, enabled: false }]);
    expect(probes(s)).toContainEqual([{ value: 0, enabled: true }]);
    expect(probes(s).length).toBeLessThanOrEqual(16);
    const pass = await evaluate(s, s.code);
    expect(pass.passed).toBe(true);
    expect(pass.note).toContain(
      "Extra subtype properties are not exhaustively sampled",
    );
    expect(
      (
        await evaluate(
          s,
          "function f<T extends {value:number;enabled:boolean}>(x:T){return x.value}",
        )
      ).passed,
    ).toBe(false);
  });
  it.each([
    "export function f<T extends {readonly value:number}>(x:T):T{return x}",
    "export async function f<T extends {value:number}>(x:T):Promise<T>{return await Promise.resolve(x)}",
    "export const f=<T extends {value:string}>(x:T)=>x.value.trim();",
    "export const f=function<T extends {value:boolean}>(x:T){return !x.value};",
    "export function f<T extends {nested:{value:number}}>(x:T){return x.nested.value*2}",
    "export function f<T extends {flag?:boolean}>(x:T){return x.flag===undefined?2:x.flag?1:0}",
    "export function f<T extends {value:number}>(x?:T){return x===undefined?0:x.value}",
    "export function f<T extends {value:number}>(x:{data:T}){return x.data.value}",
    "export function f<T extends {value:number},U extends boolean>(x:T,y:U){return x.value+(y?1:0)}",
    'export function f<T extends {value:"a"|"b"}={value:"a"}>(x:T){return x.value==="a"?1:2}',
  ])("evaluates bounded structural declarations: %s", async (content) => {
    const s = sample(content);
    expect(s.standalone).toBe(true);
    expect(probes(s).length).toBeGreaterThan(0);
    expect(probes(s).length).toBeLessThanOrEqual(64);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("keeps imported inherited bounds and constrained wrappers in the type context", async () => {
    const s = analyze([
      {
        path: "base.ts",
        content: "export interface Base {readonly value:number}",
      },
      {
        path: "types.ts",
        content:
          "import type {Base} from './base';export interface Bound extends Base {enabled:boolean} export type Box<T extends Bound>=T;",
      },
      {
        path: "app.ts",
        content:
          "import type {Bound as Shape,Box} from './types';export function f<T extends Shape>(x:Box<T>){return x.value+(x.enabled?10:0)}",
      },
    ]).symbols.find((s) => s.name === "f")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain(
      'type Shape = { readonly "value": number; "enabled": boolean };',
    );
    expect(s.practiceTypes).not.toContain("type T =");
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("samples the bound instead of only the narrower default", async () => {
    const s = sample(
      'export function f<T extends {value:"a"|"b"}={value:"a"}>(x:T){return x.value==="a"?1:2}',
    );
    expect(probes(s)).toContainEqual([{ value: "b" }]);
    expect(
      (
        await evaluate(
          s,
          "function f<T extends {value:'a'|'b'}>(x:T){return 1}",
        )
      ).passed,
    ).toBe(false);
  });
  it("rejects a reference that fabricates an arbitrary subtype", async () => {
    const s = sample(
      "export function f<T extends {value:number}>(x:T):T{return {value:x.value}}",
    );
    const result = await evaluate(s, s.code);
    expect(result.supported).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.diagnostics.join(" ")).toContain(
      "Reference cannot be evaluated",
    );
  });
  it.each([
    "export function f<T extends {a:number}={a:string}>(x:T){return x.a}",
    "export function f<T extends {a:number}={a?:number}>(x:T){return x.a}",
    "export function f<T extends {a?:boolean}={b:boolean}>(x:T){return x.a}",
    "export function f<T extends {a:number[] }>(x:T){return x.a.length}",
    "export function f<T extends {a:{b:{c:number}}}>(x:T){return x.a.b.c}",
    "export function f<T extends {a:number;b:number;c:number;d:number}>(x:T){return x.a}",
    "export function f<T extends {[name:string]:number}>(x:T){return x.a}",
    "export function f<T extends {value():number}>(x:T){return x.value()}",
    "export function f<T extends {value:number}>(x:T[]){return x.length}",
    "export function f<T extends {value:number}>(x:{a:{b:T}}){return x.a.b.value}",
  ])("leaves unsupported or invalid shapes explicit: %s", (content) => {
    const s = sample(content);
    expect(s.standalone).toBe(false);
    expect(probes(s)).toEqual([]);
  });
  it("rechecks imported structural bounds when their source changes", () => {
    const index = createAnalyzer();
    const app = {
      path: "app.ts",
      content:
        "import type {Bound} from './types';export function f<T extends Bound>(x:T){return x.value}",
    };
    const a = index([
      { path: "types.ts", content: "export type Bound={value:boolean}" },
      app,
    ]);
    const b = index([
      { path: "types.ts", content: "export type Bound={value:'a'|'b'}" },
      app,
    ]);
    expect(
      probes(a.analysis.symbols.find((s) => s.name === "f")!),
    ).toContainEqual([{ value: true }]);
    expect(
      probes(b.analysis.symbols.find((s) => s.name === "f")!),
    ).toContainEqual([{ value: "b" }]);
    expect(b.analysis).toEqual(
      analyze([
        { path: "types.ts", content: "export type Bound={value:'a'|'b'}" },
        app,
      ]),
    );
  });
});
