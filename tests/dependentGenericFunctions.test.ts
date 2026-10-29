import { describe, it, expect } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";
import { functionStub } from "../src/core/functionStub";
const sample = (content: string) =>
  analyze([{ path: "app.ts", content }]).symbols.find((s) => s.name === "f")!;

describe("generic function bounds referring to earlier parameters", () => {
  it("varies dependent scalar arguments and rejects a plausible incorrect answer", async () => {
    const s = sample(
      "export function f<T extends number,U extends T>(a:T,b:U){return a-b}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s)).toContainEqual([0, 1]);
    expect(functionStub(s, "Rewrite")).toContain(
      "T extends number, U extends T",
    );
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function f<T extends number,U extends T>(a:T,b:U){return 0}",
        )
      ).passed,
    ).toBe(false);
  });
  it.each([
    "export function f<T extends boolean,U extends T=T>(x:T,y:U){return x===y}",
    "export function f<T extends number=number,U extends T=T>(x:U){return x*2}",
    "export function f<T extends number,U extends T,V extends U>(x:V){return x+1}",
    "export function f<T extends {value:number},U extends T>(x:U){return x.value}",
    "export function f<T extends {readonly value:number},U extends T=T>(x:U):U{return x}",
    "export function f<T extends number,U extends {value:T}>(x:U){return x.value+1}",
    "export function f<T extends boolean,U extends {value:T}={value:T}>(x:U){return !x.value}",
    "export async function f<T extends number,U extends T>(x:U):Promise<U>{return await Promise.resolve(x)}",
    "export const f=<T extends number,U extends T>(x:U)=>x+1;",
    "export function f<T extends number,U extends T>(x:U[]){return x.length}",
  ])("retains valid bounded templates: %s", async (content) => {
    const s = sample(content);
    expect(s.standalone).toBe(true);
    expect(probes(s).length).toBeGreaterThan(0);
    expect(probes(s).length).toBeLessThanOrEqual(64);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("resolves an imported bound and keeps dependent wrapper declarations generic", async () => {
    const s = analyze([
      {
        path: "types.ts",
        content:
          "export type Numeric=number;export type Pair<T,U extends T>={first:T;second:U}",
      },
      {
        path: "app.ts",
        content:
          "import type {Numeric,Pair} from './types';export function f<T extends Numeric,U extends T>(x:Pair<T,U>){return x.first-x.second}",
      },
    ]).symbols.find((s) => s.name === "f")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("type Pair<T, U extends T>");
    expect(s.practiceTypes).not.toContain("type U =");
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it.each([
    "export function f<T extends number,U extends T=number>(x:U){return x}",
    "export function f<T extends number,U extends T=1>(x:U){return x}",
    "export function f<T extends {value:number},U extends T={value:number}>(x:U){return x.value}",
    "export function f<T extends number,U extends {value:T}={value:number}>(x:U){return x.value}",
    "export function f<T extends U,U extends number>(x:T){return x}",
    "export function f<T extends T>(x:T){return x}",
    "export function f<T extends {value:T}>(x:T){return x}",
    "export function f<T,U extends T>(x:U){return x}",
  ])("rejects invalid templates or unsupported bounds: %s", (content) => {
    const s = sample(content);
    expect(s.standalone).toBe(false);
    expect(probes(s)).toEqual([]);
  });
  it("does not erase the dependent type relation during reference type-checking", async () => {
    const s = sample(
      "export function f<T extends number,U extends T>(x:T):U{return x}",
    );
    const result = await evaluate(s, s.code);
    expect(result.passed).toBe(false);
    expect(result.supported).toBe(false);
    expect(result.diagnostics.join(" ")).toContain(
      "Reference cannot be evaluated",
    );
  });
});
