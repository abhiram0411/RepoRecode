import { describe, it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";
const sample = (content: string) =>
  analyze([{ path: "app.ts", content }]).symbols.find((s) => s.name === "f")!;

describe("bounded structural constraints", () => {
  it("preserves object bounds and readonly fields while grading concrete inputs", async () => {
    const s = sample(
      "type Box<T extends {readonly value:number}={readonly value:number}>={data:T};export function f(x:Box){return x.data.value+1}",
    );
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain('T extends { readonly "value": number }');
    expect(probes(s)).toContainEqual([{ data: { value: 0 } }]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect((await evaluate(s, "function f(x:Box){return 1}")).passed).toBe(
      false,
    );
    expect(
      (
        await evaluate(s, "function f(x:Box){x.data.value=1;return 2}")
      ).diagnostics.join(" "),
    ).toContain("read-only");
    expect(
      (
        await evaluate(s, "function f(x:Box<{value:string}>){return 1}")
      ).diagnostics.join(" "),
    ).toContain("constraint");
  });
  it("supports structural subsets with extra fields and literal narrowing", async () => {
    const s = sample(
      "type Input<T extends {value:number}>=T;export function f(x:Input<{value:1|2;enabled:boolean}>){return x.value+(x.enabled?10:0)}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s)).toContainEqual([{ value: 1, enabled: true }]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("expands imported inherited object bounds with optional fields", async () => {
    const s = analyze([
      {
        path: "base.ts",
        content:
          "export interface Base{value:number} export interface Bound extends Base{enabled?:boolean} export type Input<T extends Bound>=T;",
      },
      {
        path: "barrel.ts",
        content: 'export type {Input as Payload} from "./base";',
      },
      {
        path: "app.ts",
        content:
          'import type {Payload as Data} from "./barrel";export function f(x:Data<{value:number}>){return x.value+1}',
      },
    ]).symbols.find((s) => s.name === "f")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain('"enabled"?: boolean');
    expect(s.practiceTypes).not.toContain("Bound");
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("supports a dependent object bound and dependent default", async () => {
    const s = sample(
      "type Input<T,U extends T=T>=U;export function f(x:Input<{value:number}>){return x.value}",
    );
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("U extends T = T");
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it.each([
    ["{a?:number}", "{}"],
    ["{a?:number}", "{a:number}"],
    ["{a?:number}", "{a:undefined}"],
    ["{a?:boolean}", "{a?:boolean|undefined}"],
    ["{a:number|undefined}", "{a:undefined}"],
    ["{a:{value:number}}", "{a:{value:1}}"],
    ["{a?:{value:number}}", "{}"],
    ["{a:number}", "{readonly a:number}"],
    ["{readonly a:number}", "{a:number}"],
  ])("accepts %s with concrete %s", async (bound, arg) => {
    const s = sample(
      `type Input<T extends ${bound}>=T;export function f(x:Input<${arg}>){return 1}`,
    );
    expect(s.standalone).toBe(true);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it.each([
    ["{a:number}", "{}"],
    ["{a:number}", "{a?:number}"],
    ["{a:number}", "{a:string}"],
    ["{a:1|2}", "{a:number}"],
    ["{a?:number}", "{a?:string}"],
    ["{a?:number}", "{other:number}"],
    ["{a?:number}", "{a?:number|undefined}"],
    ["{a:{value:number}}", "{a:{other:number}}"],
    ["{a:{value:number}}", "{a?:{value:number}}"],
    ["{a:number|undefined}", "{}"],
    ["{a:number}", "number"],
    ["number", "{a:number}"],
    ["{a:number[]}", "{a:number[]}"],
    ["{a:{b:{c:number}}}", "{a:{b:{c:number}}}"],
    [
      "{a:number;b:number;c:number;d:number}",
      "{a:number;b:number;c:number;d:number}",
    ],
    ["{a:()=>number}", "{a:()=>number}"],
    ["{[key:string]:number}", "{a:number}"],
  ])("rejects incompatible or unbounded %s with %s", (bound, arg) => {
    expect(
      sample(
        `type Input<T extends ${bound}>=T;export function f(x:Input<${arg}>){return 1}`,
      ).standalone,
    ).toBe(false);
  });
  it("does not use concrete arguments to justify an invalid dependent default", () => {
    expect(
      sample(
        "type Input<T,U extends T={a:number}>=U;export function f(x:Input<{a:number}>){return x.a}",
      ).standalone,
    ).toBe(false);
    expect(
      sample(
        "type Input<T extends {a:number}={a:string}>=T;export function f(x:Input<{a:number}>){return x.a}",
      ).standalone,
    ).toBe(false);
  });
  it("rechecks a changed imported structural bound", () => {
    const index = createAnalyzer();
    const app = {
      path: "app.ts",
      content:
        'import type {Input} from "./types";export function f(x:Input<{a:number}>){return x.a}',
    };
    const a = index([
      {
        path: "types.ts",
        content: "export type Input<T extends {a:number}>=T",
      },
      app,
    ]);
    const b = index([
      {
        path: "types.ts",
        content: "export type Input<T extends {a:number;b:number}>=T",
      },
      app,
    ]);
    expect(a.analysis.symbols.find((s) => s.name === "f")!.standalone).toBe(
      true,
    );
    expect(b.analysis.symbols.find((s) => s.name === "f")!.standalone).toBe(
      false,
    );
  });
});
