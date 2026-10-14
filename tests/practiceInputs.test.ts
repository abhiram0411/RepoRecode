import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes, inputExpression } from "../src/core/practiceInputs";
import { functionStub } from "../src/core/functionStub";

const symbol = (code: string) =>
  analyze([{ path: "input.ts", content: code }]).symbols.find(
    (s) => s.kind === "function",
  )!;

describe("expanded bounded input contracts", () => {
  it("does not mistake locally declared Array types for the standard input contract", () => {
    const s = symbol(
      "type Array<T> = { value:T }; export function read(input:Array<number>){return input.value;}",
    );
    expect(s.standalone).toBe(false);
  });
  it("covers every literal choice, escaped strings and nullable numeric inputs", async () => {
    const s = symbol(
      `export function label(kind:'ready'|'wait'|'it\\'s ready', n:number|null){return kind + ':' + (n===null?'missing':String(n));}`,
    );
    expect(s.standalone).toBe(true);
    const inputs = probes(s);
    expect(new Set(inputs.map((v) => v[0]))).toEqual(
      new Set(["ready", "wait", "it's ready"]),
    );
    expect(inputs.some((v) => v[1] === null)).toBe(true);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          `function label(kind:'ready'|'wait'|'it\\'s ready', n:number|null){return kind + ':' + String(n);}`,
        )
      ).passed,
    ).toBe(false);
  });

  it("keeps omitted, undefined and null probes distinct and checks default behavior", async () => {
    const s = symbol(
      "export function fallback(n:number|null=7){return n===undefined?20:n===null?30:n;}",
    );
    const inputs = probes(s);
    expect(inputs).toContainEqual([]);
    expect(inputs).toContainEqual([undefined]);
    expect(inputs).toContainEqual([null]);
    expect(new Set(inputs.map(inputExpression)).size).toBe(inputs.length);
    const good = await evaluate(s, s.code);
    expect(good.passed).toBe(true);
    expect(good.cases.find((c) => c.input === "[undefined]")?.expected).toBe(
      '{"value":7,"type":"number"}',
    );
    expect(good.cases.find((c) => c.input === "[null]")?.expected).toBe(
      '{"value":30,"type":"number"}',
    );
    const bad = await evaluate(
      s,
      "function fallback(n:number|null=99){return n===null?30:n;}",
    );
    expect(bad.passed).toBe(false);
    expect(bad.cases.some((c) => c.input === "[]" && !c.passed)).toBe(true);
    expect(functionStub(s, "Try it.")).toContain("n:number|null=7");
  });

  it("includes missing trailing optional arguments without losing later parameter variation", async () => {
    const s = symbol(
      "export function mix(a:number,b?:string,c?:boolean){return a+(b?.length??0)+(c?10:0);}",
    );
    expect(s.standalone).toBe(true);
    const values = probes(s);
    expect(values.length).toBeLessThanOrEqual(64);
    expect(values.some((v) => v.length === 1)).toBe(true);
    expect(values.some((v) => v.length === 2)).toBe(true);
    expect(values.some((v) => v[0] === 100)).toBe(true);
    expect(values.some((v) => v[2] === true)).toBe(true);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function mix(a:number,b?:string,c?:boolean){return a+(b?.length??0);}",
        )
      ).passed,
    ).toBe(false);
    expect(functionStub(s, "Try it.")).toContain("b?:string");
  });

  it.each([
    "boolean[]",
    "Array<boolean>",
    "ReadonlyArray<boolean>",
    "readonly boolean[]",
  ])(
    "grades %s using both booleans, empty and ordered arrays",
    async (type) => {
      const s = symbol(
        `export function enabled(items:${type}){return items.filter(v=>v).length;}`,
      );
      expect(s.standalone).toBe(true);
      expect(probes(s)).toContainEqual([[false, true]]);
      expect(probes(s)).toContainEqual([[]]);
      expect((await evaluate(s, s.code)).passed).toBe(true);
      expect(
        (
          await evaluate(
            s,
            `function enabled(items:${type}){return items.length;}`,
          )
        ).passed,
      ).toBe(false);
    },
  );

  it("samples fixed and readonly named tuples while varying each position", async () => {
    const s = symbol(
      "export function tuple(t:readonly [value:number, enabled:boolean, label:string]){return t[0]+(t[1]?10:0)+t[2].length;}",
    );
    expect(s.standalone).toBe(true);
    const rows = probes(s).map((v) => v[0] as unknown[]);
    expect(rows.length).toBeLessThanOrEqual(16);
    for (let i = 0; i < 3; i++)
      expect(new Set(rows.map((v) => v[i])).size).toBeGreaterThan(1);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function tuple(t:readonly [number,boolean,string]){return t[0]+t[2].length;}",
        )
      ).passed,
    ).toBe(false);
  });

  it("never writes to readonly inputs in the limited type environment", async () => {
    const s = symbol(
      "export function first(items:readonly number[]){return items[0];}",
    );
    const r = await evaluate(
      s,
      "function first(items:readonly number[]){items[0]=123;return items[0];}",
    );
    expect(r.passed).toBe(false);
    expect(r.diagnostics.join(" ")).toContain("only permits reading");
  });

  it.each([
    "...input:number[]",
    "input:[number,...string[]]",
    "input:[number,string?]",
    "input:any",
    "input:unknown",
    "input:Date",
    "input:number[][]",
    "input:[number,number,number,number]",
  ])("keeps %s outside the supported harness", (parameter) => {
    const s = symbol(`export function f(${parameter}){return 1;}`);
    expect(s.standalone).toBe(false);
    expect(probes(s)).toEqual([]);
  });

  it("bounds wide unions and preserves every parameter domain inside the 64-probe cap", () => {
    const type = Array.from({ length: 16 }, (_, i) => `'v${i}'`).join("|");
    const s = symbol(
      `export function f(a:${type},b:${type},c:${type}){return a+b+c;}`,
    );
    const values = probes(s);
    expect(values.length).toBeLessThanOrEqual(64);
    for (let i = 0; i < 3; i++)
      expect(new Set(values.map((v) => v[i])).size).toBe(16);
    expect(
      symbol(`export function f(a:${type}|'extra'){return a;}`).standalone,
    ).toBe(false);
  });

  it("retains undefined input support for an older saved index without parameter declarations", async () => {
    const s = symbol(
      "export function fallback(n?:number){return n===undefined?8:n;}",
    );
    s.parameters = s.parameters.map(({ name, type }) => ({ name, type }));
    expect(probes(s)).toContainEqual([undefined]);
    expect(
      (
        await evaluate(
          s,
          "function fallback(n?:number){return n===undefined?0:n;}",
        )
      ).passed,
    ).toBe(false);
  });
});
